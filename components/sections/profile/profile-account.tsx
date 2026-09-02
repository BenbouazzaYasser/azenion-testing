import { KeyRound, Sparkles, UserCircle, Calendar, LogIn } from "lucide-react";
import { ChangePasswordModal } from "./change-password-modal";
import { DeleteAccountModal } from "./delete-account-modal";
import { EmailEditor } from "./email-editor";
import { RestartOnboardingButton } from "@/components/onboarding/restart-onboarding-button";
import { formatDate } from "@/lib/date";

interface ProfileAccountProps {
  profileUserId: string;
  currentUserId: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  cardClass: string;
}

const iconContainerClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.08]";

export function ProfileAccount({
  profileUserId,
  currentUserId,
  email,
  emailVerified,
  createdAt,
  lastSignInAt,
  cardClass,
}: ProfileAccountProps) {
  if (profileUserId !== currentUserId) return null;

  return (
    <section aria-labelledby="account-heading">
      <div className="mb-6">
        <h2 id="account-heading" className="text-xl font-semibold text-ink-50">
          Account
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          Manage your account settings and security.
        </p>
      </div>

      <div className="space-y-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <EmailEditor currentEmail={email} emailVerified={emailVerified} />
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-start gap-4">
            <div className={iconContainerClass}>
              <KeyRound size={18} className="text-accent-400" />
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-ink-50">Password</h3>
                <p className="mt-1 text-sm text-ink-400">
                  Change your current password.
                </p>
              </div>
              <ChangePasswordModal />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-start gap-4">
            <div className={iconContainerClass}>
              <Sparkles size={18} className="text-accent-400" />
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-ink-50">Onboarding</h3>
                <p className="mt-1 text-sm text-ink-400">
                  Walk through profile, branch, teams, and projects again.
                </p>
              </div>
              <RestartOnboardingButton />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-start gap-4">
            <div className={iconContainerClass}>
              <UserCircle size={18} className="text-accent-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-ink-50">Account Information</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <UserCircle size={14} className="shrink-0 text-ink-600" />
                  <span className="text-ink-400">User ID:</span>
                  <code className="rounded-md bg-surface px-2 py-0.5 text-xs text-ink-200">
                    {profileUserId.slice(0, 12)}...
                  </code>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar size={14} className="shrink-0 text-ink-600" />
                  <span className="text-ink-400">Member since:</span>
                  <span className="text-ink-200">{formatDate(createdAt)}</span>
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
        </div>
      </div>

      <div className="mt-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-start">
            <span className="bg-void-950 pr-4 text-xs font-medium uppercase tracking-widest text-ink-500">
              Danger Zone
            </span>
          </div>
        </div>

        <div className={`${cardClass} border-red-500/20`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-red-400">Delete Account</h3>
              <p className="mt-1 text-sm text-ink-400">
                Permanently remove your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <DeleteAccountModal />
          </div>
        </div>
      </div>
    </section>
  );
}
