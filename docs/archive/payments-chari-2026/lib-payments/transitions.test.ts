import { describe, expect, it } from "vitest";
import { decideTransition, type TransitionInput } from "@/lib/payments/transitions";

const base: TransitionInput = {
  currentStatus: "pending",
  eventId: "payment.card.authorized",
  verifiedStatus: 2,
  amountMatches: true,
  cumulativeRefundedCents: 0,
  eventRefundCents: 0,
  paymentAmountCents: 5000,
};

describe("decideTransition", () => {
  it("grants on verified authorized event with matching amount", () => {
    expect(decideTransition(base).action).toBe("grant");
  });

  it("replays idempotently once succeeded", () => {
    expect(decideTransition({ ...base, currentStatus: "succeeded" }).action).toBe("record_only");
  });

  it("does not grant when GET status is not COMPLETED (out-of-order safe)", () => {
    expect(decideTransition({ ...base, verifiedStatus: 1 }).action).toBe("no_transition");
  });

  it("does not grant when the amount mismatches (GET mismatch)", () => {
    expect(decideTransition({ ...base, amountMatches: false }).action).toBe("no_transition");
  });

  it("does not grant when verification is unavailable (fail-closed)", () => {
    expect(decideTransition({ ...base, verifiedStatus: null, amountMatches: null }).action).toBe(
      "no_transition",
    );
  });

  it("fails on failure events", () => {
    expect(decideTransition({ ...base, eventId: "payment.failed", verifiedStatus: 3 }).action).toBe("fail");
  });

  it("keeps succeeded on partial refund and cancels on full refund", () => {
    const refund = {
      ...base,
      currentStatus: "succeeded" as const,
      eventId: "payment.refunded",
      eventRefundCents: 2000,
    };
    expect(decideTransition(refund).action).toBe("refund_partial");
    expect(
      decideTransition({ ...refund, eventRefundCents: 5000 }).action,
    ).toBe("refund_full");
  });

  it("never auto-transitions an already-refunded payment", () => {
    expect(
      decideTransition({ ...base, currentStatus: "refunded" }).action,
    ).toBe("no_transition");
  });

  it("refuses unverifiable refund amounts (fail-closed)", () => {
    expect(
      decideTransition({ ...base, currentStatus: "succeeded", eventId: "payment.refunded", eventRefundCents: null }).action,
    ).toBe("no_transition");
  });

  it("records unknown events without state change", () => {
    expect(decideTransition({ ...base, eventId: "payment.received" }).action).toBe("record_only");
  });
});
