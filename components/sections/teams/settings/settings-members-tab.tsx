"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Lock, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignMemberRoles } from "@/actions/team-roles.actions";
import { removeMember } from "@/actions/team.actions";
import type { TeamSettingsClientProps } from "./team-settings-client";

export function SettingsMembersTab({
  team,
  roles,
  members,
  canManageRoles,
  canRemoveMembers,
  currentUserId,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const roleById = new Map(roles.map((r) => [r.id, r]));

  function handleToggleRole(memberId: string, roleId: string) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const nextRoleIds = member.role_ids.includes(roleId)
      ? member.role_ids.filter((id) => id !== roleId)
      : [...member.role_ids, roleId];

    setBusyMemberId(memberId);
    const formData = new FormData();
    formData.set("team_id", team.id);
    formData.set("member_id", memberId);
    formData.set("role_ids", JSON.stringify(nextRoleIds));
    formData.set("slug", team.slug);

    startTransition(async () => {
      const result = await assignMemberRoles(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Roles updated.");
      }
      setBusyMemberId(null);
      router.refresh();
    });
  }

  function handleRemove(memberId: string, displayName: string) {
    const formData = new FormData();
    formData.set("team_id", team.id);
    formData.set("user_id", memberId);
    formData.set("slug", team.slug);

    startTransition(async () => {
      const result = await removeMember(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${displayName} removed from the team.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border-strong bg-surface p-6 shadow-card backdrop-blur-xl sm:p-8">
        <h3 className="text-lg font-semibold text-ink-50">Members</h3>
        <p className="mt-1 text-sm text-ink-400">
          {members.length} total · {roles.length} roles
        </p>
        {!canManageRoles ? (
          <div className="mt-4">
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-500">
              <Lock size={13} className="mr-1.5 inline -translate-y-px" />
              Only the team owner can assign roles to members.
            </div>
          </div>
        ) : null}
      </div>

      {members.map((member) => {
        const displayName = member.full_name || `@${member.username}`;
        const initials = displayName.charAt(0).toUpperCase();
        const isOwner = member.role === "owner";
        const isSelf = member.id === currentUserId;
        const isBusy = isPending && busyMemberId === member.id;

        return (
          <div
            key={member.id}
            className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-surface p-5 shadow-card backdrop-blur-xl sm:flex-row sm:items-start sm:justify-between sm:p-6"
          >
            <div className="flex min-w-0 items-start gap-4">
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatar_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl border border-accent-400/30 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-lg font-semibold text-accent-400">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.95rem] font-semibold text-ink-50">{displayName}</span>
                  {isSelf ? (
                    <span className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-medium text-ink-500">
                      You
                    </span>
                  ) : null}
                  {isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-400">
                      <Crown size={11} />
                      Owner
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-500">@{member.username}</p>

                {member.role_ids.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {member.role_ids.map((roleId) => {
                      const role = roleById.get(roleId);
                      if (!role) return null;
                      return (
                        <span
                          key={roleId}
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                          style={{
                            borderColor: `${role.color ?? "#6d6dff"}40`,
                            color: role.color ?? "#a5a5ff",
                            backgroundColor: `${role.color ?? "#6d6dff"}14`,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: role.color ?? "#a5a5ff" }}
                          />
                          {role.name}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
              {canManageRoles && !isOwner ? (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {roles.map((role) => {
                    const checked = member.role_ids.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleRole(member.id, role.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                          checked
                            ? "border-accent-400/50 bg-accent/[0.12] text-accent-200"
                            : "border-border-strong text-ink-500 hover:border-accent-400/40 hover:text-ink-200"
                        }`}
                      >
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {canRemoveMembers && !isOwner && !isSelf ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleRemove(member.id, displayName)}
                >
                  <UserMinus size={13} />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
