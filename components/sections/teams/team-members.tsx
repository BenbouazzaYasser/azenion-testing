"use client";

import { useTransition } from "react";
import { Users, Crown, Shield, ArrowUp, ArrowDown, X } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { updateMemberRole, removeMember } from "@/actions/team.actions";

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
  teamSlug: string;
  currentUserId: string | null;
  userRole: string | null;
}

export function TeamMembers({ members, teamId, teamSlug, currentUserId, userRole }: TeamMembersProps) {
  const [isPending, startTransition] = useTransition();
  if (members.length === 0) return null;

  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin";

  function handleRoleChange(targetUserId: string, newRole: string) {
    const formData = new FormData();
    formData.set("team_id", teamId);
    formData.set("user_id", targetUserId);
    formData.set("role", newRole);
    formData.set("slug", teamSlug);

    startTransition(async () => {
      await updateMemberRole(formData);
    });
  }

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
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="team-members-heading">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[25%] top-[15%] h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute right-[10%] bottom-[20%] h-48 w-48 rounded-full bg-accent-400/8 blur-[110px]" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Team
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="team-members-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Meet the team
            <span className="ml-3 text-lg font-normal text-ink-500">
              ({members.length})
            </span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, i) => {
            const profile = member.profile;
            const displayName = profile.full_name || `@${profile.username}`;
            const initials = displayName.charAt(0).toUpperCase();
            const isSelf = currentUserId === profile.id;
            const canManageRole = (isOwner || (isAdmin && member.role === "member")) && !isSelf && member.role !== "owner";
            const canRemove = (isOwner || (isAdmin && member.role === "member")) && !isSelf && member.role !== "owner";

            return (
              <Reveal key={profile.id} delay={i * 80}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col items-center p-8 text-center sm:p-9">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-16 w-16 rounded-xl border border-accent-400/30 object-cover transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-xl font-semibold text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm">
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
                          Owner
                        </span>
                      ) : null}
                      {member.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-400/30 bg-accent/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-accent-300">
                          <Shield size={11} />
                          Admin
                        </span>
                      ) : null}
                    </div>

                    {canManageRole || canRemove ? (
                      <div className="mt-4 flex gap-2">
                        {canManageRole && member.role === "member" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRoleChange(profile.id, "admin")}
                            disabled={isPending}
                          >
                            <ArrowUp size={12} />
                            Promote
                          </Button>
                        ) : null}
                        {canManageRole && member.role === "admin" && isOwner ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRoleChange(profile.id, "member")}
                            disabled={isPending}
                          >
                            <ArrowDown size={12} />
                            Demote
                          </Button>
                        ) : null}
                        {canRemove ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemove(profile.id)}
                            disabled={isPending}
                          >
                            <X size={12} />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
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
