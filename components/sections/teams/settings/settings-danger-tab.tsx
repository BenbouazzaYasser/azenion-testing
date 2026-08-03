"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTeam } from "@/actions/team.actions";
import { TransferOwnershipConfirmModal } from "@/components/shared/transfer-ownership-confirm-modal";
import type { TeamSettingsClientProps, SettingsMember } from "./team-settings-client";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-red-400/60 focus:bg-white/[0.06]";

export function SettingsDangerTab({
  team,
  isOwner,
  members,
  currentUserId,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();
  const [transferTarget, setTransferTarget] = useState<SettingsMember | null>(null);

  const eligibleMembers = members.filter(
    (m) => m.id !== currentUserId && m.role !== "owner"
  );

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 shadow-card backdrop-blur-xl sm:p-8">
        <h3 className="text-lg font-semibold text-ink-50">Danger Zone</h3>
        <div className="mt-4 rounded-xl border border-border bg-white/[0.02] px-4 py-3 text-sm text-ink-500">
          <Lock size={13} className="mr-1.5 inline -translate-y-px" />
          Only the team owner can transfer ownership or delete this team.
        </div>
      </div>
    );
  }

  function handleDelete() {
    const formData = new FormData();
    formData.set("team_id", team.id);
    startDeleteTransition(async () => {
      const result = await deleteTeam(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else if (result && "success" in result && result.success && result.redirectTo) {
        toast.success("Team deleted.");
        router.refresh();
        router.push(result.redirectTo);
      }
    });
  }

  return (
    <div className="space-y-6">
      {transferTarget ? (
        <TransferOwnershipConfirmModal
          open={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          type="team"
          resourceName={team.name}
          targetMember={{
            id: transferTarget.id,
            full_name: transferTarget.full_name,
            username: transferTarget.username,
            avatar_url: transferTarget.avatar_url,
            role: transferTarget.role,
          }}
          resourceId={team.id}
          slug={team.slug}
        />
      ) : null}

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-300">Transfer Ownership</p>
            <p className="mt-0.5 text-sm text-amber-200/70">
              Transfer ownership of this team to another member. You will become a regular member after the transfer.
            </p>
          </div>
        </div>

        {eligibleMembers.length > 0 ? (
          <div className="mt-5 space-y-2">
            {eligibleMembers.map((member) => {
              const displayName = member.full_name || `@${member.username}`;
              const initials = displayName.charAt(0).toUpperCase();
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border-strong bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {member.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-white/[0.1] object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-400 text-sm font-semibold text-white">
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-50">{displayName}</p>
                      <p className="truncate text-xs text-ink-500">@{member.username}</p>
                    </div>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setTransferTarget(member)}>
                    Transfer
                    <ArrowRight size={13} />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-500">There is nobody to transfer ownership to.</p>
        )}
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.03] p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <Trash2 size={20} className="shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-300">Delete Team</p>
            <p className="mt-0.5 text-sm text-red-200/70">
              This action is irreversible. The team, memberships, roles, and all associated data will be permanently deleted.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="delete-confirm" className="mb-2 block text-sm font-medium text-ink-200">
            Type <span className="font-bold text-red-400">{team.name}</span> to confirm
          </label>
          <input
            id="delete-confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={team.name}
            className={inputClass}
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-5 w-full bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-500/60"
          disabled={deleteConfirm !== team.name || deletePending}
          onClick={handleDelete}
        >
          {deletePending ? "Deleting..." : `Delete "${team.name}"`}
        </Button>
      </div>
    </div>
  );
}
