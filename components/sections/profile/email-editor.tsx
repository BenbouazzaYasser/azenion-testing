"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeEmail } from "@/actions/settings.actions";
import { toast } from "sonner";
import { useTranslation } from "@/components/translation/translation-provider";

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-2.5 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950";

export function EmailEditor({
  currentEmail,
  emailVerified,
}: {
  currentEmail: string;
  emailVerified: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const emailDirty = emailValue.trim().length > 0 && emailValue.trim() !== currentEmail;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await changeEmail(new FormData(e.currentTarget));
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res?.message ?? t("settings.emailChangeToast"));
      setEmailValue("");
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.08]">
        <Mail size={18} className="text-accent-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-ink-50">{t("auth.email")}</h3>
          {emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
              <CheckCircle size={12} />
              {t("settings.verified")}
            </span>
          ) : null}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
            <input
              name="email"
              type="email"
              defaultValue={currentEmail}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={!emailDirty || isPending}>
                {isPending ? t("settings.emailSending") : t("settings.emailUpdate")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setEmailValue("");
                }}
                disabled={isPending}
              >
                {t("settings.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-1 text-sm text-ink-400">{currentEmail}</p>
        )}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={t("settings.editProfile")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        >
          <Pencil size={15} />
        </button>
      ) : null}
    </div>
  );
}
