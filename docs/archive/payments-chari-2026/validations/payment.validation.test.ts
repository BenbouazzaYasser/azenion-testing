import { describe, expect, it } from "vitest";
import { coursePurchaseSchema, createCheckoutSchema } from "@/lib/validations/payment.validation";

describe("payment validation", () => {
  it("accepts a valid course id and defaults currency to mad", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(createCheckoutSchema.parse({ courseId: id })).toEqual({ courseId: id });
    expect(coursePurchaseSchema.parse({ courseId: id }).currency).toBe("mad");
  });

  it("rejects invalid ids and strips client-supplied price (tamper-proof form)", () => {
    expect(() => createCheckoutSchema.parse({ courseId: "nope" })).toThrow();
    // Unknown keys (e.g. a forged price) are stripped: price can only ever
    // come from the server-loaded course row.
    const parsed = createCheckoutSchema.parse({ courseId: "123e4567-e89b-12d3-a456-426614174000", price: 1 });
    expect(parsed).not.toHaveProperty("price");
  });
});
