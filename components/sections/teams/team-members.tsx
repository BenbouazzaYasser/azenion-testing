"use client";

import { useTransition, useState } from "react";
import { Users, Crown, Shield, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeMember } from "@/actions/team.actions";
import { InviteMemberDialog } from "./invite-member-dialog";
import { useTranslation } from "@/components/translation/translation-provider";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface MemberWithProfile {
  role: string;
  joined_at: string | null;
  profile: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface TeamMembersProps {
  members: MemberWithProfile[];
  teamId: string;
  teamName: string;
  teamSlug: string;
  currentUserId: string | null;
  canInvite: boolean;
  canRemoveMembers: boolean;
}

export function TeamMembers({ members, teamId, teamName, teamSlug, currentUserId, canInvite, canRemoveMembers }: TeamMembersProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  if (members.length === 0) return null;

  function handleRemove(targetUserId: string) {
    const formData = new FormData();
    formData.set("team_id", teamId);
    formData.set("user_id", targetUserId);
    formData.set("slug", teamSlug);

    startTransition(async () => {
      await removeMember(formData);
    });
  }

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="team-members-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
            {t("teams.membersEyebrow")}
          </div>
        

        
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <h2
              id="team-members-heading"
              className="text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              {t("teams.membersTitle")}
              <span className="ml-3 text-lg font-normal text-ink-500">
                ({members.length})
              </span>
            </h2>
            {canInvite ? (
              <Button size="sm" variant="secondary" onClick={() => setShowInviteDialog(true)}>
                <UserPlus size={14} />
                {t("teams.invite")}
              </Button>
            ) : null}
          </div>
        

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, i) => {
            const profile = member.profile;
            const displayName = profile.full_name || `@${profile.username}`;
            const initials = displayName.charAt(0).toUpperCase();
            const isSelf = currentUserId === profile.id;
            const canRemove = canRemoveMembers && !isSelf && member.role !== "owner";

            return (
              
                <div key={profile.id} className="group relative flex h-full flex-col overflow-hidden rounded-2xl card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col items-center p-8 text-center sm:p-9">
                    {profile.avatar_url ? (
                      <OptimizedImage
                        src={profile.avatar_url}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-xl border border-accent-400/30 transition-all duration-500 ease-premium group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-xl font-semibold text-accent-400 transition-all duration-500 ease-premium group-hover:scale-[1.05]">
                        {initials}
                      </div>
                    )}

                    <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {displayName}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <div className="flex items-center gap-1.5 text-sm text-ink-400">
                        <Users size={13} className="shrink-0" aria-hidden="true" />
                        <span className="capitalize">{member.role}</span>
                      </div>
                      {member.role === "owner" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-400">
                          <Crown size={11} />
                          {t("common.owner")}
                        </span>
                      ) : null}
                      {member.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-400/30 bg-accent/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-accent-300">
                          <Shield size={11} />
                          {t("common.admin")}
                        </span>
                      ) : null}
                    </div>

                    {canRemove ? (
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(profile.id)}
                          disabled={isPending}
                        >
                          <X size={12} />
                          {t("teams.remove")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              
            );
          })}
        </div>

        <InviteMemberDialog
          teamId={teamId}
          teamName={teamName}
          open={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onSuccess={() => setShowInviteDialog(false)}
        />
      </div>
    </section>
  );
}
