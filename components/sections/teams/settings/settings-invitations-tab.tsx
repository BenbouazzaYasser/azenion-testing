"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Hourglass, Lock, Mail, MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewTeamJoinRequest } from "@/actions/team-membership.actions";
import { formatDistanceToNow } from "@/lib/date";
import type { TeamSettingsClientProps, SettingsJoinRequest, SettingsInvitation } from "./team-settings-client";

function JoinRequestRow({ request, onReview }: { request: SettingsJoinRequest; onReview: (id: string, accept: boolean) => void }) {
  const displayName = request.full_name || `@${request.username}`;
  const initials = displayName.charAt(0).toUpperCase();
  const requestedAgo = formatDistanceToNow(new Date(request.created_at));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {request.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={request.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-accent-400/30 object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] font-semibold text-accent-400">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-50">{displayName}</span>
            <span className="text-xs text-ink-500">@{request.username}</span>
            <span className="text-xs text-ink-600">· {requestedAgo}</span>
          </div>
          {request.message ? (
            <div className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-400">
              <MessageSquareText size={13} className="mt-0.5 shrink-0 text-accent-400" />
              <p className="line-clamp-2">{request.message}</p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => onReview(request.id, false)}>
          <X size={13} />
          Decline
        </Button>
        <Button size="sm" variant="primary" onClick={() => onReview(request.id, true)}>
          <Check size={13} />
          Accept
        </Button>
      </div>
    </div>
  );
}

function InvitationRow({ invitation }: { invitation: SettingsInvitation }) {
  const displayName = invitation.full_name || `@${invitation.username}`;
  const initials = displayName.charAt(0).toUpperCase();
  const status = invitation.status.toLowerCase();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-strong bg-white/[0.02] p-4">
      {invitation.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={invitation.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-accent-400/30 object-cover" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] font-semibold text-accent-400">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-50">{displayName}</span>
          <span className="text-xs text-ink-500">@{invitation.username}</span>
        </div>
        <p className="mt-0.5 text-xs text-ink-500">
          {invitation.invited_by_username
            ? `Invited by @${invitation.invited_by_username}`
            : "Invited"}
          {" · "}
          {formatDistanceToNow(new Date(invitation.created_at))}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${
          invitation.status === "PENDING"
            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
            : invitation.status === "ACCEPTED"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

export function SettingsInvitationsTab({
  team,
  joinRequests,
  invitations,
  canReviewRequests,
  canInvite,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pendingRequests = joinRequests.filter((r) => r.status === "PENDING");
  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");

  function handleReview(requestId: string, accept: boolean) {
    startTransition(async () => {
      const result = await reviewTeamJoinRequest({ request_id: requestId, accept });
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(accept ? "Request accepted. New member added." : "Request declined.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Hourglass size={16} className="text-yellow-400" />
          <h3 className="text-lg font-semibold text-ink-50">Join requests</h3>
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-medium text-yellow-400">
            {pendingRequests.length}
          </span>
        </div>

        {canReviewRequests ? (
          pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <JoinRequestRow key={request.id} request={request} onReview={handleReview} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 text-center text-sm text-ink-500 shadow-card backdrop-blur-xl">
              No pending join requests.
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 shadow-card backdrop-blur-xl">
            <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-3 text-sm text-ink-500">
              <Lock size={13} className="mr-1.5 inline -translate-y-px" />
              You need the REVIEW_JOIN_REQUESTS permission to review join requests.
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Mail size={16} className="text-accent-400" />
          <h3 className="text-lg font-semibold text-ink-50">Sent invitations</h3>
          <span className="rounded-full border border-border-strong bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-ink-400">
            {invitations.length}
          </span>
        </div>

        {canInvite ? (
          invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <InvitationRow key={invitation.id} invitation={invitation} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 text-center text-sm text-ink-500 shadow-card backdrop-blur-xl">
              No invitations sent yet.
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 shadow-card backdrop-blur-xl">
            <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-3 text-sm text-ink-500">
              <Lock size={13} className="mr-1.5 inline -translate-y-px" />
              You need the INVITE_MEMBERS permission to see sent invitations.
            </div>
          </div>
        )}
      </div>

      {isPending ? <p className="text-sm text-ink-500">Working…</p> : null}
    </div>
  );
}
