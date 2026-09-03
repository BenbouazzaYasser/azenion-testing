"use client";

import { useEffect, useState } from "react";
import { X, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { useTranslation } from "@/components/translation/translation-provider";

export function DeleteAccountModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="border-red-500/40 text-red-400 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300"
        onClick={() => setOpen(true)}
      >
        {t("settings.deleteAccount")}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label={t("settings.deleteAccount")}
        >
          <button
            type="button"
            aria-label={t("settings.closeAria")}
            className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
            style={{ opacity: mounted ? 1 : 0 }}
            onClick={() => setOpen(false)}
          />

          <div
            ref={dialogFocusRef}
            tabIndex={-1}
            className="relative z-10 max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scale(1)" : "scale(0.95)",
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-8 py-6">
              <h2 className="text-lg font-semibold text-ink-50">{t("settings.deleteAccount")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("settings.closeAria")}
                className="-mr-1.5 -mt-1.5 rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-8 py-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                  <TriangleAlert size={24} className="text-red-400" />
                </div>

                <h3 className="mt-4 text-base font-semibold text-ink-50">
                  {t("settings.areYouSure")}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-ink-400">
                  {t("settings.deleteUnavailable")}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  {t("settings.gotIt")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
