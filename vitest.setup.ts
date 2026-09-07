import { vi } from "vitest";

// server-only throws outside React Server Components (including Vitest).
// Neutralize it for unit tests; production Next builds keep the real guard.
vi.mock("server-only", () => ({}));
