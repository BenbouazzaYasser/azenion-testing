import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("translates network failures", () => {
    expect(friendlyError(new Error("Network request failed"))).toMatch(/offline/i);
    expect(friendlyError(new TypeError("fetch failed"))).toMatch(/offline/i);
  });

  it("translates authorization failures without leaking internals", () => {
    expect(friendlyError(new Error('new row violates row-level security policy for table "x"'))).toBe("Not allowed.");
  });

  it("translates auth failures", () => {
    expect(friendlyError(new Error("Invalid login credentials"))).toMatch(/incorrect email/i);
    expect(friendlyError(new Error("User already registered"))).toMatch(/already exists/i);
  });

  it("passes through short server messages and caps long ones", () => {
    expect(friendlyError(new Error("Course not found."))).toBe("Course not found.");
    expect(friendlyError(new Error("x".repeat(300)))).toBe("Something went wrong. Please retry.");
  });

  it("never includes tokens", () => {
    const secret = "eyJhbGciOiJIUzI1NiJ9.secret";
    expect(friendlyError(new Error(`fetch failed ${secret}`))).not.toContain(secret);
  });
});
