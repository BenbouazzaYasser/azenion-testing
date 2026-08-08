"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseDialogFocusOptions {
  trap?: boolean;
  /** Where initial focus lands on open. "panel" focuses the dialog container; "none" leaves focus untouched (e.g. when an autoFocus field exists). */
  initialFocus?: "panel" | "none";
}

/**
 * Modal dialog focus management:
 * - Moves focus to the dialog container on open (unless initialFocus is "none").
 * - Traps Tab/Shift+Tab inside the dialog so focus can't escape to the background.
 * - Restores focus to the previously focused element (the trigger) on close.
 *
 * Attach the returned ref to the dialog panel element.
 */
export function useDialogFocus<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  { trap = true, initialFocus = "panel" }: UseDialogFocusOptions = {},
) {
  const ref = useRef<T>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    if (initialFocus === "none") return;

    const frame = requestAnimationFrame(() => {
      ref.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, initialFocus]);

  useEffect(() => {
    if (!open || !trap) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !ref.current) return;
      const el = ref.current;
      const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (!el.contains(active)) return;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, trap]);

  useEffect(() => {
    if (!open) return;
    return () => {
      const restore = restoreRef.current;
      restoreRef.current = null;
      if (restore) {
        requestAnimationFrame(() => restore.focus());
      }
    };
  }, [open]);

  return ref;
}
