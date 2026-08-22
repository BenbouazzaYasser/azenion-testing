"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Hourglass, MessageSquareText, X } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { reviewTeamJoinRequest } from "@/actions/team-membership.actions";
import { formatDistanceToNow } from "@/lib/date";

export interface JoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  institution: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface TeamJoinRequestsProps {
  requests: JoinRequest[];
}

export function TeamJoinRequests({ requests }: TeamJoinRequestsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === "PENDING");

  if (pending.length === 0) return null;

  function handleReview(requestId: string, accept: boolean) {
    setBusyRequestId(requestId);
    startTransition(async () => {
      const result = await reviewTeamJoinRequest({ request_id: requestId, accept });
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(accept ? "Request accepted. New member added." : "Request declined.");
      }
      setBusyRequestId(null);
      router.refresh();
    });
  }

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="team-join-requests-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-yellow-400">
            <Hourglass size={12} />
            Pending Requests
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="team-join-requests-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Join requests
            <span className="ml-3 text-lg font-normal text-ink-500">({pending.length})</span>
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-ink-400">
            People who want to join this team. Accepting a request adds them as a member.
          </p>
        </Reveal>

        <div className="mt-10 space-y-4">
          {pending.map((request, i) => {
            const displayName = request.full_name || `@${request.username}`;
            const initials = displayName.charAt(0).toUpperCase();
            const requestedAgo = request.created_at ? formatDistanceToNow(new Date(request.created_at)) : "Recently";
            const isBusy = isPending && busyRequestId === request.id;

            return (
              <Reveal key={request.id} delay={i * 60}>
                <div className="flex flex-col gap-4 rounded-2xl border border-border-strong/[0.08] card-surface p-5 shadow-card backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex min-w-0 items-start gap-4">
                    {request.avatar_url ? (
                      <img
                        src={request.avatar_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl border border-accent-400/30 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-lg font-semibold text-accent-400">
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[0.95rem] font-semibold text-ink-50">{displayName}</span>
                        <span className="text-sm text-ink-500">@{request.username}</span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-400">
                        {request.institution ? <span>{request.institution}</span> : null}
                        <span className="text-ink-600">•</span>
                        <span>Requested {requestedAgo}</span>
                      </div>

                      {request.message ? (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink-300">
                          <MessageSquareText size={14} className="mt-0.5 shrink-0 text-accent-400" />
                          <p className="line-clamp-2">{request.message}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReview(request.id, false)}
                      disabled={isPending}
                    >
                      <X size={14} />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleReview(request.id, true)}
                      disabled={isPending}
                    >
                      <Check size={14} />
                      {isBusy ? "Working..." : "Accept"}
                    </Button>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
