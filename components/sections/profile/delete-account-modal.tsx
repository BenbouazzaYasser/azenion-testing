"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, TriangleAlert, Trash2, CalendarClock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { requestAccountDeletion, cancelAccountDeletion } from "@/actions/settings.actions";
import type { DeletionStatus } from "@/lib/settings-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const DAY_MS = 86_400_000;

interface DeleteAccountModalProps {
  username: string;
  deletion?: DeletionStatus;
  onScheduled?: (scheduledAt: string) => void;
  onCancelled?: () => void;
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-red-400/60 focus:bg-surface-hover focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950";

export function DeleteAccountModal({
  username,
  deletion,
  onScheduled,
  onCancelled,
}: DeleteAccountModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [scheduledAt, setScheduledAt] = useState<string | null>(
    deletion?.scheduledAt ?? null,
  );
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    setScheduledAt(deletion?.scheduledAt ?? null);
  }, [deletion?.scheduledAt]);

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
      setConfirm("");
    };
  }, [open]);

  const pending = !!scheduledAt;
  const daysLeft = scheduledAt
    ? Math.max(0, Math.ceil((new Date(scheduledAt).getTime() - Date.now()) / DAY_MS))
    : null;
  const matches = confirm.trim() === username;

  function handleRequest() {
    startTransition(async () => {
      const res = await requestAccountDeletion();
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Account deletion scheduled. You have 30 days to appeal.");
      const nextScheduled = res && "scheduledAt" in res ? res.scheduledAt : null;
      if (nextScheduled) {
        setScheduledAt(nextScheduled);
        onScheduled?.(nextScheduled);
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleAppeal() {
    startTransition(async () => {
      const res = await cancelAccountDeletion();
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Deletion cancelled — your account is safe.");
      setScheduledAt(null);
      onCancelled?.();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className={
          pending
            ? "border-amber-500/40 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/10 hover:text-amber-200"
            : "border-red-500/40 text-red-400 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300"
        }
        onClick={() => setOpen(true)}
      >
        {pending ? (
          <>
            <CalendarClock size={14} />
            Deletion scheduled
          </>
        ) : (
          "Delete Account"
        )}
      </Button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Delete account"
            >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
            style={{ opacity: mounted ? 1 : 0 }}
            onClick={() => setOpen(false)}
          />

          <div
            ref={dialogFocusRef}
            tabIndex={-1}
            className="relative z-10 max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scale(1)" : "scale(0.95)",
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-8 py-6">
              <h2 className="text-lg font-semibold text-ink-50">
                {pending ? "Account Deletion" : "Delete Account"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1.5 -mt-1.5 rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-8 py-6">
              {pending ? (
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                    <CalendarClock size={24} className="text-amber-400" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-ink-50">
                    Your deletion is pending
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-ink-400">
                    Your account is scheduled for permanent deletion on{" "}
                    <span className="font-medium text-ink-200">
                      {scheduledAt ? formatDate(scheduledAt) : ""}
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
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                    <TriangleAlert size={24} className="text-red-400" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-ink-50">
                    Are you sure?
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-ink-400">
                    Your account and all associated data — including your profile,
                    posts, chats, memberships, teams and projects — will be
                    permanently deleted. You will have{" "}
                    <span className="font-medium text-ink-200">30 days</span> to
                    appeal from the moment you confirm before anything is removed.
                  </p>
                </div>
              )}

              {!pending ? (
                <div className="mt-5">
                  <label htmlFor="delete-account-confirm" className="mb-2 block text-sm font-medium text-ink-200">
                    Type <span className="font-bold text-red-400">@{username}</span> to confirm
                  </label>
                  <input
                    id="delete-account-confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={`@${username}`}
                    className={inputClass}
                  />
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                {pending ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setOpen(false)}
                    >
                      Keep my account
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="border-amber-500/40 bg-amber-500/20 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/30 hover:text-amber-200"
                      disabled={isPending}
                      onClick={handleAppeal}
                    >
                      {isPending ? (
                        "Cancelling…"
                      ) : (
                        <>
                          <Undo2 size={14} />
                          Cancel deletion
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setOpen(false)}
                    >
                      Keep my account
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="border-red-500/40 bg-red-500/20 text-red-300 hover:border-red-500/60 hover:bg-red-500/30 hover:text-red-200"
                      disabled={!matches || isPending}
                      onClick={handleRequest}
                    >
                      {isPending ? (
                        "Scheduling…"
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Delete my account
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}