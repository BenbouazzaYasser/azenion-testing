import { describe, expect, it } from "vitest";
import {
  AmountUnitUnconfirmedError,
  assertChargeableCurrency,
  formatMadPrice,
  fromProviderAmount,
  toProviderAmount,
} from "@/lib/payments/money";

describe("money boundary", () => {
  it("fails closed while amount units are unconfirmed", () => {
    expect(() => toProviderAmount(100)).toThrow(AmountUnitUnconfirmedError);
    expect(() => fromProviderAmount(100)).toThrow(AmountUnitUnconfirmedError);
  });

  it("accepts only mad as a chargeable currency", () => {
    expect(() => assertChargeableCurrency("mad")).not.toThrow();
    expect(() => assertChargeableCurrency("usd")).toThrow();
    expect(() => assertChargeableCurrency("")).toThrow();
  });

  it("formats display prices without touching provider conversion", () => {
    expect(formatMadPrice(1250)).toBe("12.50 MAD");
    expect(formatMadPrice(0)).toBe("0.00 MAD");
  });
});
