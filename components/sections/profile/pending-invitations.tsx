"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, MailOpen, X } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { respondToTeamInvitation } from "@/actions/team-membership.actions";
import { formatDistanceToNow } from "@/lib/date";

export interface TeamInvitation {
  id: string;
  team_id: string;
  team_name: string;
  team_slug: string;
  team_logo_url: string | null;
  invited_by_username: string | null;
  invited_by_full_name: string | null;
  status: string;
  created_at: string;
}

interface PendingInvitationsProps {
  invitations: TeamInvitation[];
  cardClass: string;
}

export function PendingInvitations({ invitations, cardClass }: PendingInvitationsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = invitations.filter((i) => i.status === "PENDING");

  if (pending.length === 0) return null;

  function handleRespond(invitationId: string, accept: boolean) {
    setBusyId(invitationId);
    startTransition(async () => {
      const result = await respondToTeamInvitation({ invitation_id: invitationId, accept });
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(accept ? "Welcome to the team!" : "Invitation declined.");
      }
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2">
        <MailOpen className="h-4 w-4 text-accent-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
          Invitations
        </h2>
        <span className="rounded-full border border-accent/25 bg-accent/[0.08] px-2 py-0.5 text-[11px] font-medium text-accent-300">
          {pending.length}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {pending.map((inv) => {
          const invitedBy = inv.invited_by_full_name || (inv.invited_by_username ? `@${inv.invited_by_username}` : "someone");
          const invitedAgo = inv.created_at ? formatDistanceToNow(new Date(inv.created_at)) : "Recently";
          const isBusy = isPending && busyId === inv.id;
          const initials = inv.team_name.charAt(0).toUpperCase();

          return (
            <Reveal key={inv.id}>
              <div className={`${cardClass} p-4`}>
                <div className="flex items-start gap-3">
                  {inv.team_logo_url ? (
                    <img
                      src={inv.team_logo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-[0.75rem] border border-accent-400/30 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border border-accent-400/30 bg-accent/[0.08] text-sm font-semibold text-accent-400">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/teams/${inv.team_slug}`}
                      className="text-[0.95rem] font-semibold text-ink-50 transition-colors hover:text-accent-400"
                    >
                      {inv.team_name}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-400">
                      Invited by {invitedBy} • {invitedAgo}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRespond(inv.id, false)}
                        disabled={isPending}
                      >
                        <X size={13} />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleRespond(inv.id, true)}
                        disabled={isPending}
                      >
                        <Check size={13} />
                        {isBusy ? "Joining..." : "Accept"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
