"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MailPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteTeamMember } from "@/actions/team-membership.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

interface InviteMemberDialogProps {
  teamId: string;
  teamName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberDialog({ teamId, teamName, open, onClose, onSuccess }: InviteMemberDialogProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open, onClose]);

  function resetForm() {
    setValue("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a username or email.");
      return;
    }

    const isEmail = trimmed.includes("@");

    startTransition(async () => {
      const result = await inviteTeamMember({
        team_id: teamId,
        username: isEmail ? "" : trimmed,
        email: isEmail ? trimmed : "",
      });

      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }

      onClose();
      resetForm();
      toast.success("Invitation sent.");
      onSuccess();
      router.refresh();
    });
  }

  return (
    <>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Invite a member"
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={onClose}
              />

              <div
                ref={dialogFocusRef}
                tabIndex={-1}
                className="relative z-10 flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Invite a member</h2>
                    <p className="mt-1 text-sm text-ink-400">
                      Invite someone to <span className="font-medium text-ink-200">{teamName}</span> by their
                      username or email. They&apos;ll accept the invitation from their profile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="invite-member-input" className="mb-1.5 block text-sm font-medium text-ink-200">
                        Username or email
                      </label>
                      <input
                        id="invite-member-input"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        required
                        maxLength={254}
                        placeholder="e.g. @teamleader or teamleader@test.com"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                        <MailPlus size={14} />
                        {isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
