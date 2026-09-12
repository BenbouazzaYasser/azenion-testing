/**
 * Centralized payment state-transition decisions (pure logic, no I/O).
 *
 * The webhook route and any future reconciler call decideTransition() and
 * then perform the returned action with the service-role client. Webhook
 * event names TRIGGER reconciliation; they never grant entitlement by
 * themselves — every grant/fail/refund decision additionally requires the
 * authoritative provider GET result passed in here.
 */

export type LocalPaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type TransitionAction =
  | "grant" // mark succeeded + create entitlement + initial allocation
  | "fail" // mark failed, no entitlement
  | "refund_full" // mark refunded + cancel entitlement + refund/clawback records
  | "refund_partial" // records only; payment stays succeeded, entitlement active
  | "record_only" // idempotent replay or informational event; no state change
  | "no_transition"; // cannot decide safely (GET mismatch/unavailable, unknown correlation)

export interface TransitionInput {
  currentStatus: LocalPaymentStatus;
  eventId: string;
  /** Authoritative provider status (OperationStatus), null when GET failed. */
  verifiedStatus: number | null;
  /** Whether the provider-reported amount matches our pending amount. Null when unverifiable. */
  amountMatches: boolean | null;
  /** Cumulative refunded minor units including this event. */
  cumulativeRefundedCents: number;
  /**
   * This event's refund amount in minor units (0 for non-refund events).
   * Null when the amount cannot be verified (units unconfirmed) — forces
   * no_transition on refund paths (fail-closed).
   */
  eventRefundCents: number | null;
  /** Our payment amount in minor units. */
  paymentAmountCents: number;
}

export interface TransitionDecision {
  action: TransitionAction;
  reason: string;
}

const AUTHORIZED_EVENTS = new Set(["payment.card.authorized"]);
// Informational events: reconciled/logged upstream, never transition state.
const INFORMATIONAL_EVENTS = new Set(["payment.received"]);
const FAILED_EVENTS = new Set(["payment.failed"]);

export function decideTransition(input: TransitionInput): TransitionDecision {
  const {
    currentStatus,
    eventId,
    verifiedStatus,
    amountMatches,
    cumulativeRefundedCents,
    eventRefundCents,
    paymentAmountCents,
  } = input;

  // Terminal refunded state: never transition again automatically.
  if (currentStatus === "refunded") {
    return { action: "no_transition", reason: "payment already refunded; manual review required" };
  }

  // Already succeeded: replays converge without writes.
  if (currentStatus === "succeeded" && AUTHORIZED_EVENTS.has(eventId)) {
    return { action: "record_only", reason: "already succeeded; idempotent replay" };
  }

  // Refund events are evaluated on the ledger, independent of current status
  // (except terminal refunded handled above).
  if (eventId === "payment.refunded") {
    if (verifiedStatus === null) {
      return { action: "no_transition", reason: "refund unverified: provider GET unavailable" };
    }
    if (eventRefundCents === null) {
      return { action: "no_transition", reason: "refund amount unverifiable: units unconfirmed" };
    }
    const cumulative = cumulativeRefundedCents + eventRefundCents;
    if (cumulative >= paymentAmountCents && paymentAmountCents > 0) {
      return { action: "refund_full", reason: `cumulative refunded ${cumulative} >= payment ${paymentAmountCents}` };
    }
    return { action: "refund_partial", reason: `cumulative refunded ${cumulative} < payment ${paymentAmountCents}` };
  }

  // Grant path: authorized event + authoritative COMPLETED + amount match.
  if (AUTHORIZED_EVENTS.has(eventId)) {
    if (verifiedStatus === null || amountMatches === null) {
      return { action: "no_transition", reason: "grant unverified: GET status or amount unavailable" };
    }
    if (verifiedStatus !== 2) {
      return { action: "no_transition", reason: `provider status ${verifiedStatus} is not COMPLETED; awaiting final state` };
    }
    if (!amountMatches) {
      return { action: "no_transition", reason: "provider amount does not match pending payment; manual review required" };
    }
    return { action: "grant", reason: "verified COMPLETED with matching amount" };
  }

  // Failure path.
  if (FAILED_EVENTS.has(eventId) || verifiedStatus === 3 || verifiedStatus === 4) {
    if (currentStatus === "failed") {
      return { action: "record_only", reason: "already failed; idempotent replay" };
    }
    return { action: "fail", reason: `failure signalled (event=${eventId}, verified=${verifiedStatus})` };
  }

  if (INFORMATIONAL_EVENTS.has(eventId)) {
    return { action: "record_only", reason: `informational event ${eventId}; no state change` };
  }

  return { action: "record_only", reason: `unknown event ${eventId}; no state change` };
}
