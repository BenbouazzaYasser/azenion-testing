import { describe, expect, it } from "vitest";
import { decideFileAccess } from "@/lib/payments/access";

describe("decideFileAccess", () => {
  it("allows free courses for everyone including anonymous", () => {
    expect(
      decideFileAccess({ isFree: true, ownerId: "o", callerUserId: null, isStaff: false, hasActiveEntitlement: false }),
    ).toBe("allow");
  });

  it("allows legacy rows without lifecycle data (safe default)", () => {
    expect(
      decideFileAccess({ isFree: null, ownerId: null, callerUserId: null, isStaff: false, hasActiveEntitlement: false }),
    ).toBe("allow");
  });

  it("requires authentication for paid courses (unauthorized)", () => {
    expect(
      decideFileAccess({ isFree: false, ownerId: "o", callerUserId: null, isStaff: false, hasActiveEntitlement: false }),
    ).toBe("deny_unauthenticated");
  });

  it("allows owner, staff and entitled holders", () => {
    const paid = { isFree: false, ownerId: "owner" };
    expect(decideFileAccess({ ...paid, callerUserId: "owner", isStaff: false, hasActiveEntitlement: false })).toBe("allow");
    expect(decideFileAccess({ ...paid, callerUserId: "staff", isStaff: true, hasActiveEntitlement: false })).toBe("allow");
    expect(decideFileAccess({ ...paid, callerUserId: "buyer", isStaff: false, hasActiveEntitlement: true })).toBe("allow");
  });

  it("denies paid access without entitlement (forbidden)", () => {
    expect(
      decideFileAccess({ isFree: false, ownerId: "o", callerUserId: "stranger", isStaff: false, hasActiveEntitlement: false }),
    ).toBe("deny_forbidden");
  });
});
