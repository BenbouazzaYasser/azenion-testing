/**
 * Money boundary for Academy payments.
 *
 * All database values are integer minor units (`amount_cents`). Conversion to
 * whatever unit the provider expects lives ONLY behind the functions below.
 *
 * BLOCKER: Chari has not yet confirmed whether the collect API expects major
 * units (MAD) or minor units. Until sandbox testing resolves this, every
 * conversion function throws AmountUnitUnconfirmedError. This is deliberate:
 * provider execution is impossible while units are unknown, so cents can
 * never be sent as MAD (or vice versa) by accident. Flipping this to a real
 * conversion is an explicit, reviewed change — do not divide/multiply by 100
 * anywhere else in the codebase.
 */

export const SUPPORTED_CURRENCY = "mad" as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCY;

export class AmountUnitUnconfirmedError extends Error {
  constructor() {
    super(
      "Provider amount unit unconfirmed: Chari sandbox testing must establish " +
        "whether collect amounts are major (MAD) or minor units before any " +
        "provider execution. See lib/payments/chari.server.ts.",
    );
    this.name = "AmountUnitUnconfirmedError";
  }
}

/** Assert a currency value coming from DB rows is one we can charge. */
export function assertChargeableCurrency(currency: string): asserts currency is SupportedCurrency {
  if (currency !== SUPPORTED_CURRENCY) {
    throw new Error(`Unsupported checkout currency: ${currency} (MAD-only v1)`);
  }
}

/**
 * Convert integer minor units (amount_cents) to the provider's expected
 * amount representation. FAILS CLOSED until units are confirmed.
 */
export function toProviderAmount(_amountCents: number): number {
  throw new AmountUnitUnconfirmedError();
}

/**
 * Convert a provider-reported amount back to integer minor units.
 * FAILS CLOSED until units are confirmed.
 */
export function fromProviderAmount(_providerAmount: number): number {
  throw new AmountUnitUnconfirmedError();
}

/**
 * Display formatting for MAD prices in the UI (minor units → "12.50 MAD").
 * This is presentation only and is unrelated to the unverified provider unit
 * question above: the dirham is decimal (100 centimes = 1 MAD) by ISO
 * definition; what remains unknown is which unit the Chari collect API
 * expects, and that stays behind toProviderAmount().
 */
export function formatMadPrice(amountCents: number): string {
  return `${(amountCents / 100).toFixed(2)} MAD`;
}
