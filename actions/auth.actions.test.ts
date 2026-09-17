import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signUp } from "@/actions/auth.actions";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const headersMock = headers as unknown as ReturnType<typeof vi.fn>;
const rlMock = checkRateLimit as unknown as ReturnType<typeof vi.fn>;
const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const createAdminMock = createAdminClient as unknown as ReturnType<typeof vi.fn>;
const redirectMock = redirect as unknown as ReturnType<typeof vi.fn>;
const revalidateMock = revalidatePath as unknown as ReturnType<typeof vi.fn>;

function mockIp(ip: string | null) {
  headersMock.mockResolvedValue({
    get: (name: string) => (name === "x-forwarded-for" ? ip : null),
  });
}

function allow() {
  rlMock.mockResolvedValue({ allowed: true, remaining: 4 });
}

function deny() {
  rlMock.mockResolvedValue({ allowed: false, remaining: 0 });
}

function userClient(opts: {
  signUpError?: { message: string } | null;
  signInError?: { message: string } | null;
} = {}) {
  return {
    auth: {
      signUp: vi.fn(async () => ({ error: opts.signUpError ?? null })),
      signInWithPassword: vi.fn(async () => ({ error: opts.signInError ?? null })),
    },
  };
}

function signupForm(): FormData {
  const fd = new FormData();
  fd.set("email", "user@example.com");
  fd.set("password", "secret123");
  fd.set("username", "newuser");
  fd.set("full_name", "New User");
  return fd;
}

function signinForm(identifier: string, next?: string): FormData {
  const fd = new FormData();
  fd.set("identifier", identifier);
  fd.set("password", "secret123");
  if (next !== undefined) fd.set("next", next);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIp("1.2.3.4");
});

describe("signUp rate limiting", () => {
  it("rejects when over the limit before touching Supabase", async () => {
    deny();
    const res = await signUp(signupForm());
    expect(res).toEqual({ error: "Too many sign-up attempts. Please try again later." });
    expect(rlMock).toHaveBeenCalledWith("auth_signup", "ip:1.2.3.4", 5, 3600);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("falls back to an unknown key when no forwarding header is present", async () => {
    mockIp(null);
    deny();
    await signUp(signupForm());
    expect(rlMock).toHaveBeenCalledWith("auth_signup", "ip:unknown", 5, 3600);
  });

  it("creates the user when under the limit", async () => {
    allow();
    const client = userClient();
    createClientMock.mockResolvedValue(client);
    const res = await signUp(signupForm());
    expect(res).toEqual({ success: true });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
      options: { data: { username: "newuser", full_name: "New User" } },
    });
    expect(revalidateMock).toHaveBeenCalled();
  });

  it("surfaces Supabase sign-up errors", async () => {
    allow();
    const client = userClient({ signUpError: { message: "User already registered" } });
    createClientMock.mockResolvedValue(client);
    const res = await signUp(signupForm());
    expect(res).toEqual({ error: "User already registered" });
    expect(revalidateMock).not.toHaveBeenCalled();
  });
});

describe("signIn rate limiting", () => {
  it("rejects when over the limit before touching Supabase", async () => {
    deny();
    const res = await signIn(signinForm("user@example.com"));
    expect(res).toEqual({ error: "Too many sign-in attempts. Please try again later." });
    expect(rlMock).toHaveBeenCalledWith("auth_signin", "ip:1.2.3.4", 10, 900);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(createAdminMock).not.toHaveBeenCalled();
  });

  it("signs in directly when the identifier is an email (no username lookup)", async () => {
    allow();
    const client = userClient();
    createClientMock.mockResolvedValue(client);
    await signIn(signinForm("user@example.com"));
    expect(createAdminMock).not.toHaveBeenCalled();
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    });
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("resolves usernames to emails via the login oracle", async () => {
    allow();
    const client = userClient();
    createClientMock.mockResolvedValue(client);
    const rpc = vi.fn(async () => ({ data: "user@example.com", error: null }));
    createAdminMock.mockReturnValue({ rpc });
    await signIn(signinForm("someuser"));
    expect(rpc).toHaveBeenCalledWith("get_login_email_by_username", { p_username: "someuser" });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    });
  });

  it("surfaces authentication failures without redirecting", async () => {
    allow();
    const client = userClient({ signInError: { message: "Invalid login credentials" } });
    createClientMock.mockResolvedValue(client);
    const res = await signIn(signinForm("user@example.com"));
    expect(res).toEqual({ error: "Invalid login credentials" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("follows a safe relative next path after sign-in", async () => {
    allow();
    createClientMock.mockResolvedValue(userClient());
    await signIn(signinForm("user@example.com", "/teams"));
    expect(redirectMock).toHaveBeenCalledWith("/teams");
  });

  it("ignores absolute or login/join next paths (open-redirect guard)", async () => {
    allow();
    createClientMock.mockResolvedValue(userClient());
    await signIn(signinForm("user@example.com", "https://evil.example/phish"));
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
