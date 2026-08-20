"use client";

import { useEffect, useState, useTransition } from "react";
import { TriangleAlert, LogOut, ShieldOff, CalendarClock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "./settings-panel";
import { DeleteAccountModal } from "@/components/sections/profile/delete-account-modal";
import { signOutEverywhere, cancelAccountDeletion } from "@/actions/settings.actions";
import { signOut } from "@/actions/auth.actions";
import type { DeletionStatus } from "@/lib/settings-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const DAY_MS = 86_400_000;

interface DangerZoneSectionProps {
  username: string;
  deletion: DeletionStatus;
}

export function DangerZoneSection({ username, deletion }: DangerZoneSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [appealPending, startAppeal] = useTransition();
  const [signedOutEverywhere, setSignedOutEverywhere] = useState(false);
  const [deletionState, setDeletionState] = useState<DeletionStatus>(deletion);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const pendingDeletion = deletionState.scheduledAt;

  useEffect(() => {
    if (!pendingDeletion) {
      setDaysLeft(null);
      return;
    }
    const compute = () =>
      setDaysLeft(
        Math.max(0, Math.ceil((new Date(pendingDeletion).getTime() - Date.now()) / DAY_MS)),
      );
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [pendingDeletion]);

  function handleSignOutEverywhere() {
    startTransition(async () => {
      const res = await signOutEverywhere();
      if (res && "unavailable" in res && res.unavailable) {
        toast.info("Signing out everywhere isn't available yet — coming soon.");
        setSignedOutEverywhere(true);
      }
    });
  }

  function handleAppeal() {
    startAppeal(async () => {
      const res = await cancelAccountDeletion();
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Deletion cancelled — your account is safe.");
      setDeletionState({ requestedAt: null, scheduledAt: null });
    });
  }

  return (
    <div className="space-y-4">
      {pendingDeletion ? (
        <SettingsPanel className="border-amber-500/25">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                <CalendarClock size={18} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-amber-300">
                  Account deletion scheduled
                </h3>
                <p className="mt-1 max-w-lg text-sm text-ink-400">
                  Your account is set to be permanently deleted on{" "}
                  <span className="font-medium text-ink-200">
                    {formatDate(pendingDeletion)}
                  </span>
                  {daysLeft !== null ? (
                    <>
                      {" "}({daysLeft} {daysLeft === 1 ? "day" : "days"} left).
                    </>
                  ) : (
                    "."
                  )}{" "}
                  You can appeal and keep your account any time before then.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 border-amber-500/40 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/10 hover:text-amber-200"
              onClick={handleAppeal}
              disabled={appealPending}
            >
              {appealPending ? "Cancelling…" : (
                <>
                  <Undo2 size={14} />
                  Cancel deletion
                </>
              )}
            </Button>
          </div>
        </SettingsPanel>
      ) : (
        <SettingsPanel className="border-red-500/20">
          <div className="flex items-start gap-4 p-6 sm:p-7">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
              <TriangleAlert size={18} className="text-red-400" />
            </div>
            <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-red-400">Delete Account</h3>
                <p className="mt-1 max-w-md text-sm text-ink-400">
                  Delete your account and all associated data. You will have 30
                  days to appeal before it is permanently removed.
                </p>
              </div>
              <DeleteAccountModal
                username={username}
                deletion={deletionState}
                onScheduled={(scheduledAt) =>
                  setDeletionState({ requestedAt: new Date().toISOString(), scheduledAt })
                }
                onCancelled={() => setDeletionState({ requestedAt: null, scheduledAt: null })}
              />
            </div>
          </div>
        </SettingsPanel>
      )}

      <SettingsPanel>
        <div className="flex items-center gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-strong/[0.1] bg-surface">
            <ShieldOff size={18} className="text-ink-300" />
          </div>
          <div className="flex flex-1 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-medium text-ink-50">Sign out everywhere</h3>
              <p className="mt-1 text-sm text-ink-400">
                {signedOutEverywhere
                  ? "Remote session revocation is not available yet."
                  : "End all active sessions across every device."}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSignOutEverywhere} disabled={isPending || signedOutEverywhere}>
              {isPending ? "Waiting…" : signedOutEverywhere ? "Unavailable" : "Sign out everywhere"}
            </Button>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-center gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-strong/[0.1] bg-surface">
            <LogOut size={18} className="text-ink-300" />
          </div>
          <div className="flex flex-1 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-medium text-ink-50">Sign out of this device</h3>
              <p className="mt-1 text-sm text-ink-400">End your current session and return to the login screen.</p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </SettingsPanel>
    </div>
  );
}