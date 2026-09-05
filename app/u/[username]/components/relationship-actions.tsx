"use client";

import { useState, useTransition } from "react";
import { UserCheck, UserMinus, UserPlus, Loader2, Check, X, ArrowLeft } from "lucide-react";
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unfriend,
  followUser,
  unfollowUser,
} from "@/actions/social.actions";

type FriendStatus = "none" | "request_sent" | "request_received" | "friends";

interface RelationshipState {
  friend_status: FriendStatus;
  is_following: boolean;
  follower_count: number;
  following_count: number;
  friend_count: number;
}

interface RelationshipActionsProps {
  profileId: string;
  relationship: RelationshipState;
  cardClass: string;
}

interface FriendButtonProps {
  profileId: string;
  status: FriendStatus;
  isPending: boolean;
  onRun: (
    action: () => Promise<{ success?: boolean; error?: string }>,
    patch: Partial<RelationshipState>,
  ) => void;
}

function FriendButton({ profileId, status, isPending, onRun }: FriendButtonProps) {
  switch (status) {
    case "friends":
      return (
        <button
          type="button"
          onClick={() => onRun(() => unfriend(profileId), { friend_status: "none" })}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-medium text-ink-200 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-red-400/40 hover:text-red-300 hover:shadow-glow-sm disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
          Friends
        </button>
      );
    case "request_sent":
      return (
        <button
          type="button"
          onClick={() => onRun(() => cancelFriendRequest(profileId), { friend_status: "none" })}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-medium text-ink-200 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-glow-sm disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} />}
          Request sent
        </button>
      );
    case "request_received":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onRun(() => acceptFriendRequest(profileId), { friend_status: "friends" })}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-void-950 shadow-card transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-accent-300 hover:shadow-glow-sm disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Accept
          </button>
          <button
            type="button"
            onClick={() => onRun(() => declineFriendRequest(profileId), { friend_status: "none" })}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-medium text-ink-300 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-red-400/40 hover:text-red-300 hover:shadow-glow-sm disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
            Decline
          </button>
        </div>
      );
    default:
      return (
        <button
          type="button"
          onClick={() => onRun(() => sendFriendRequest(profileId), { friend_status: "request_sent" })}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full border border-accent-400/40 bg-accent/[0.08] px-5 py-2.5 text-sm font-medium text-accent-300 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-accent/[0.14] hover:text-accent-200 hover:shadow-glow-sm disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Add friend
        </button>
      );
  }
}

export function RelationshipActions({ profileId, relationship, cardClass }: RelationshipActionsProps) {
  const [state, setState] = useState<RelationshipState>(relationship);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success?: boolean; error?: string }>, patch: Partial<RelationshipState>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setState((prev) => ({ ...prev, ...patch }));
    });
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-8 text-sm">
          <div>
            <p className="text-xl font-semibold text-ink-50">{state.friend_count}</p>
            <p className="text-xs uppercase tracking-wide text-ink-500">Friends</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-ink-50">{state.follower_count}</p>
            <p className="text-xs uppercase tracking-wide text-ink-500">Followers</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-ink-50">{state.following_count}</p>
            <p className="text-xs uppercase tracking-wide text-ink-500">Following</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FriendButton
            profileId={profileId}
            status={state.friend_status}
            isPending={isPending}
            onRun={run}
          />
          <button
            type="button"
            onClick={() =>
              run(
                () =>
                  state.is_following
                    ? unfollowUser(profileId)
                    : followUser(profileId),
                { is_following: !state.is_following },
              )
            }
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-medium text-ink-200 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-glow-sm disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : state.is_following ? (
              <UserMinus size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {state.is_following ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      ) : null}
    </div>
  );
}