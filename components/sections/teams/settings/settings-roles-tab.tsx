"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Lock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEAM_PERMISSION_GROUPS } from "@/lib/team-permissions";
import {
  createTeamRole,
  updateTeamRole,
  deleteTeamRole,
  setRolePermissions,
} from "@/actions/team-roles.actions";
import type { TeamSettingsClientProps, SettingsRole } from "./team-settings-client";

const COLOR_PRESETS = ["#6d6dff", "#16a34a", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6", "#64748b"];

function ColorDot({ color, className }: { color: string | null; className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${className ?? ""}`}
      style={{ backgroundColor: color ?? "#6d6dff" }}
    />
  );
}

export function SettingsRolesTab({
  team,
  roles,
  canManageRoles,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(COLOR_PRESETS[0] ?? null);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;

    const formData = new FormData();
    formData.set("team_id", team.id);
    formData.set("name", newName);
    formData.set("color", newColor ?? "");
    formData.set("slug", team.slug);

    startTransition(async () => {
      const result = await createTeamRole(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Role "${newName.trim()}" created.`);
        setNewName("");
        setNewColor(COLOR_PRESETS[0] ?? null);
        setShowCreate(false);
        router.refresh();
      }
    });
  }

  function handleRename(role: SettingsRole) {
    if (!editName.trim() || editName.trim() === role.name) {
      setEditingRoleId(null);
      return;
    }
    const formData = new FormData();
    formData.set("role_id", role.id);
    formData.set("name", editName);
    formData.set("color", role.color ?? "");
    formData.set("slug", team.slug);

    startTransition(async () => {
      const result = await updateTeamRole(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role renamed.");
        setEditingRoleId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(role: SettingsRole) {
    const formData = new FormData();
    formData.set("role_id", role.id);
    formData.set("team_id", team.id);
    formData.set("slug", team.slug);

    startTransition(async () => {
      const result = await deleteTeamRole(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Role "${role.name}" deleted.`);
        router.refresh();
      }
    });
  }

  function handleTogglePermission(role: SettingsRole, permission: string) {
    const next = role.permissions.includes(permission)
      ? role.permissions.filter((p) => p !== permission)
      : [...role.permissions, permission];

    setBusyRoleId(role.id);
    const formData = new FormData();
    formData.set("role_id", role.id);
    formData.set("permissions", JSON.stringify(next));
    formData.set("slug", team.slug);

    startTransition(async () => {
      const result = await setRolePermissions(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      }
      setBusyRoleId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-strong/[0.08] bg-surface p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div>
          <h3 className="text-lg font-semibold text-ink-50">Roles &amp; permissions</h3>
          <p className="mt-1 text-sm text-ink-400">
            Members inherit permissions from the roles they are assigned.
          </p>
        </div>
        {canManageRoles ? (
          <Button size="sm" variant="secondary" onClick={() => setShowCreate((v) => !v)}>
            <Plus size={14} />
            New Role
          </Button>
        ) : null}
      </div>

      {showCreate && canManageRoles ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-accent-400/30 bg-accent/[0.03] p-5 shadow-card backdrop-blur-xl sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Role name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={40}
                placeholder="e.g. Media Manager"
                className="w-full rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Color</label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      newColor === c ? "scale-110 ring-2 ring-white/60" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" size="sm" disabled={isPending || !newName.trim()}>
              <Check size={14} />
              {isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      ) : null}

      {roles.map((role) => {
        const isLastRole = roles.length <= 1;
        const busy = isPending && busyRoleId === role.id;
        const editing = editingRoleId === role.id;

        return (
          <div
            key={role.id}
            className="overflow-hidden rounded-2xl border border-border-strong/[0.08] bg-surface shadow-card backdrop-blur-xl"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
              <ColorDot color={role.color} />
              {editing && canManageRoles ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={40}
                    className="rounded-lg border border-border-strong/[0.08] bg-surface px-3 py-1.5 text-sm text-ink-50 outline-none focus:border-accent-400/60"
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleRename(role)}>
                    <Check size={14} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[0.95rem] font-semibold text-ink-50">{role.name}</span>
                  {canManageRoles ? (
                    <button
                      type="button"
                      aria-label={`Rename ${role.name}`}
                      className="rounded p-1 text-ink-600 transition-colors hover:text-ink-200"
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setEditName(role.name);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                  ) : null}
                </div>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-ink-400">
                <Users size={11} />
                {role.member_count} {role.member_count === 1 ? "member" : "members"}
              </span>

              {canManageRoles ? (
                <div className="ml-auto flex items-center gap-2">
                  <select
                    aria-label={`Color for ${role.name}`}
                    value={role.color ?? ""}
                    onChange={(e) => {
                      const formData = new FormData();
                      formData.set("role_id", role.id);
                      formData.set("name", role.name);
                      formData.set("color", e.target.value);
                      formData.set("slug", team.slug);
                      startTransition(async () => {
                        const result = await updateTeamRole(formData);
                        if (result && "error" in result && result.error) toast.error(result.error);
                        else router.refresh();
                      });
                    }}
                    className="rounded-lg border border-border-strong/[0.08] bg-void-900 px-2 py-1 text-xs text-ink-300 outline-none"
                  >
                    <option value="">Default</option>
                    {COLOR_PRESETS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLastRole}
                    onClick={() => handleDelete(role)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="px-5 py-5 sm:px-6">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
                Permissions
              </p>
              {TEAM_PERMISSION_GROUPS.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <p className="mb-2 text-sm font-medium text-ink-300">{group.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.permissions.map((def) => {
                      const checked = role.permissions.includes(def.permission);
                      if (!canManageRoles) {
                        return (
                          <div
                            key={def.permission}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                              checked
                                ? "border-accent-400/30 bg-accent/[0.06] text-ink-200"
                                : "border-border bg-white/[0.01] text-ink-600"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                checked ? "bg-accent-400" : "bg-ink-700"
                              }`}
                            />
                            {def.label}
                          </div>
                        );
                      }
                      return (
                        <button
                          key={def.permission}
                          type="button"
                          disabled={busy}
                          onClick={() => handleTogglePermission(role, def.permission)}
                          title={def.description}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 disabled:opacity-50 ${
                            checked
                              ? "border-accent-400/40 bg-accent/[0.08] text-ink-100 hover:bg-accent/[0.12]"
                              : "border-border bg-white/[0.01] text-ink-400 hover:border-accent-400/30 hover:text-ink-200"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-accent-400 bg-accent text-white"
                                : "border-border-strong"
                            }`}
                          >
                            {checked ? <Check size={11} /> : null}
                          </span>
                          {def.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {roles.length === 0 && canManageRoles ? (
        <div className="rounded-2xl border border-border-strong/[0.08] bg-surface p-10 text-center shadow-card backdrop-blur-xl">
          <p className="text-ink-400">No roles yet. Create your first role to start assigning permissions.</p>
        </div>
      ) : null}

      {!canManageRoles ? (
        <div className="rounded-2xl border border-border-strong/[0.08] bg-surface p-6 shadow-card backdrop-blur-xl">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-500">
            <Lock size={13} className="mr-1.5 inline -translate-y-px" />
            Only the team owner can create, edit, or delete roles and change permissions.
          </div>
        </div>
      ) : null}
    </div>
  );
}
