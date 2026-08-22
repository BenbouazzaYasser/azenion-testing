"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { getPublicProfile } from "@/actions/social.actions";
import { cardBase, sectionCardClass } from "@/components/sections/profile/card-classes";
import { PublicProfileHeader } from "@/app/u/[username]/components/public-profile-header";
import { RelationshipActions } from "@/app/u/[username]/components/relationship-actions";
import { PublicProfileTimeline } from "@/app/u/[username]/components/public-profile-timeline";
import { PublicProfilePosts } from "@/app/u/[username]/components/public-profile-posts";

interface ProfilePreviewDialogProps {
  open: boolean;
  username: string | null;
  onClose: () => void;
}

export function ProfilePreviewDialog({ open, username, onClose }: ProfilePreviewDialogProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(open);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getPublicProfile>> | null>(null);

  useEffect(() => {
    if (!open || !username) return;
    setProfile(null);
    let cancelled = false;
    getPublicProfile(username).then((res) => {
      if (!cancelled) setProfile(res);
    });
    return () => {
      cancelled = true;
    };
  }, [open, username]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const data = profile && "data" in profile ? profile.data : null;
  const error = profile && "error" in profile ? profile.error : null;
  const p = data?.profile;

  const hidden =
    !!data && !!p && data.privacy.show_profile_publicly === false && !data.relationship.is_viewer;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-label={p ? p.full_name || `@${p.username}` : "Profile"}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-accent-300/70 to-transparent"
        />

        <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <p className="text-sm font-semibold text-ink-100">
            {p ? p.full_name || `@${p.username}` : "Profile"}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          >
            <X size={15} />
          </button>
        </div>

        {!profile ? (
          <div className="flex flex-col items-center justify-center px-6 py-20">
            <Loader2 size={22} className="animate-spin text-accent-300" />
            <p className="mt-3 text-sm text-ink-400">Loading profile…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <p className="text-sm font-medium text-ink-200">Couldn&apos;t load this profile</p>
            <p className="mt-1.5 text-xs text-ink-500">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full px-5 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-surface-hover hover:text-ink-50"
            >
              Close
            </button>
          </div>
        ) : p && hidden ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className={`${sectionCardClass} w-full`}>
              <p className="text-sm font-medium text-ink-200">This profile is private</p>
              <p className="mt-1.5 text-sm text-ink-600">
                This member has chosen not to share their profile publicly.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full px-5 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-surface-hover hover:text-ink-50"
            >
              Close
            </button>
          </div>
        ) : p && data ? (
          <div className={`min-h-0 flex-1 overflow-y-auto ${SCROLLBAR_CLASSES}`}>
            <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-6">
              <PublicProfileHeader profile={p} cardClass={cardBase} />

              <RelationshipActions
                profileId={p.id}
                relationship={data.relationship}
                cardClass={cardBase}
              />

              {data.privacy.show_activity || data.relationship.is_viewer ? (
                <PublicProfileTimeline activities={data.activities} cardClass={sectionCardClass} />
              ) : null}

              <PublicProfilePosts posts={data.posts} cardClass={sectionCardClass} />
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
