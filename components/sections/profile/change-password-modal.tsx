"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePassword } from "@/actions/profile.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { useTranslation } from "@/components/translation/translation-provider";

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-2.5 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

export function ChangePasswordModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open, { initialFocus: "none" });

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 2000);
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("settings.changePassword")}
      </Button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label={t("settings.changePassword")}
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
                className="relative z-10 flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-y-auto rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-center justify-between border-b border-border px-8 py-6">
                  <h2 className="text-lg font-semibold text-ink-50">{t("settings.changePassword")}</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("settings.closeAria")}
                    className="-mr-1.5 -mt-1.5 rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6">
                  <div className="space-y-5">
                    {error ? (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                      </div>
                    ) : null}

                    {success ? (
                      <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                        {t("settings.passwordUpdated")}
                      </div>
                    ) : null}

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-ink-200">{t("settings.newPassword")}</span>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          placeholder={t("settings.passwordPlaceholder")}
                          autoFocus
                          className={`${inputClass} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? t("settings.hidePassword") : t("settings.showPassword")}
                          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:text-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-ink-200">{t("settings.confirmNewPassword")}</span>
                      <div className="relative">
                        <input
                          name="confirm_password"
                          type={showConfirm ? "text" : "password"}
                          required
                          minLength={6}
                          placeholder={t("settings.confirmPasswordPlaceholder")}
                          className={`${inputClass} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          aria-label={showConfirm ? t("settings.hideConfirmation") : t("settings.showConfirmation")}
                          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:text-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setOpen(false)}
                      disabled={isPending}
                    >
                      {t("settings.cancel")}
                    </Button>
                    <Button type="submit" variant="primary" size="sm" disabled={isPending || success}>
                      {isPending ? t("settings.updatingDots") : t("settings.updatePassword")}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
