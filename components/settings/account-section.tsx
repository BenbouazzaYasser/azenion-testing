"use client";

import { useState, useTransition } from "react";
import { CheckCircle, KeyRound, Mail, UserCircle, Calendar, LogIn, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangePasswordModal } from "@/components/sections/profile/change-password-modal";
import { SettingsPanel } from "./settings-panel";
import { changeEmail, changeUsername } from "@/actions/settings.actions";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const inputClass =
  "w-full rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-2.5 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950";

interface AccountSectionProps {
  userId: string;
  currentEmail: string;
  emailVerified: boolean;
  currentUsername: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  onDirty: (dirty: boolean) => void;
}

export function AccountSection({
  userId,
  currentEmail,
  emailVerified,
  currentUsername,
  createdAt,
  lastSignInAt,
  onDirty,
}: AccountSectionProps) {
  const [emailValue, setEmailValue] = useState("");
  const [usernameValue, setUsernameValue] = useState(currentUsername ?? "");
  const [isPendingEmail, startEmail] = useTransition();
  const [isPendingUsername, startUsername] = useTransition();

  const usernameDirty = usernameValue.trim() !== (currentUsername ?? "");
  const emailDirty = emailValue.trim().length > 0 && emailValue.trim() !== currentEmail;

  function registerDirty() {
    onDirty(emailDirty || usernameDirty);
  }

  function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startEmail(async () => {
      const res = await changeEmail(new FormData(e.currentTarget));
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res?.message ?? "Verification email sent");
      setEmailValue("");
      onDirty(false);
    });
  }

  function handleUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startUsername(async () => {
      const res = await changeUsername(new FormData(e.currentTarget));
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        onDirty(true);
        return;
      }
      setUsernameValue(res?.username ?? usernameValue);
      toast.success("Username updated");
      onDirty(false);
    });
  }

  return (
    <div className="space-y-4">
      <SettingsPanel>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-7">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
              <Mail size={18} className="text-accent-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-ink-50">Email</h3>
                {emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-400">
                    <CheckCircle size={11} />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    Unverified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-400">{currentEmail}</p>
            </div>
</div>
          <form onSubmit={handleEmail} className="w-full sm:w-[320px]">
            <label htmlFor="new-email-input" className="block text-xs font-medium text-ink-300">
              New email
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="new-email-input"
                name="email"
                type="email"
                value={emailValue}
                onChange={(e) => {
                  setEmailValue(e.target.value);
                  registerDirty();
                }}
                placeholder="you@example.com"
                className={inputClass}
              />
              <Button type="submit" variant="secondary" size="sm" disabled={!emailDirty || isPendingEmail}>
                {isPendingEmail ? "Sending…" : "Update"}
              </Button>
            </div>
          </form>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
              <UserCircle size={18} className="text-accent-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-ink-50">Username</h3>
              <p className="mt-1 text-sm text-ink-400">
                {currentUsername ? `@${currentUsername}` : "No username set"}
              </p>
            </div>
          </div>
          <form onSubmit={handleUsername} className="flex w-full sm:w-auto items-center gap-2">
            <span className="text-ink-500">@</span>
            <input
              name="username"
              value={usernameValue}
              onChange={(e) => {
                setUsernameValue(e.target.value);
                registerDirty();
              }}
              className={`${inputClass} w-full sm:w-40`}
              maxLength={20}
            />
            <Button type="submit" variant="secondary" size="sm" disabled={!usernameDirty || isPendingUsername}>
              {isPendingUsername ? "Saving…" : "Save"}
            </Button>
          </form>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-center gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
            <KeyRound size={18} className="text-accent-300" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-ink-50">Password</h3>
              <p className="mt-1 text-sm text-ink-400">Change your current password.</p>
            </div>
            <ChangePasswordModal />
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-start gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
            <Pencil size={18} className="text-accent-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-ink-50">Account Information</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2.5 text-sm">
                <UserCircle size={14} className="shrink-0 text-ink-600" />
                <span className="text-ink-400">User ID:</span>
                <code className="rounded-md border border-border-strong/[0.08] bg-surface px-2 py-0.5 text-xs text-ink-200">
                  {userId.slice(0, 12)}…
                </code>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar size={14} className="shrink-0 text-ink-600" />
                <span className="text-ink-400">Member since:</span>
                <span className="text-ink-200">{createdAt ? formatDate(createdAt) : "—"}</span>
              </div>
              {lastSignInAt ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <LogIn size={14} className="shrink-0 text-ink-600" />
                  <span className="text-ink-400">Last sign in:</span>
                  <span className="text-ink-200">{formatDate(lastSignInAt)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SettingsPanel>
    </div>
  );
}