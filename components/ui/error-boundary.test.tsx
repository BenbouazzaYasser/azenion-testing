import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// NOTE: the repo vitest environment is node (no DOM/jsdom), so full render
// tests of the fallback UI are not possible here. These tests lock the
// fail-safe contract that matters most: any render error transitions the
// boundary into its recovery state instead of propagating, and the error
// reporting path never throws. If jsdom is ever added, extend this file
// with a throwing-child render test asserting the fallback title/message
// and the Retry remount behavior.

describe("ErrorBoundary fail-safe contract", () => {
  it("transitions to recovery state for any derived error, preserving the error", () => {
    const error = new Error("boom");
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it("never throws while reporting the caught error", () => {
    const boundary = new ErrorBoundary({ children: null });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() =>
        boundary.componentDidCatch(new Error("render failed"), {
          componentStack: "in TestChild",
        } as React.ErrorInfo),
      ).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
