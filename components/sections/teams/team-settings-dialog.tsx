"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Settings, ImagePlus, AlertTriangle, Users, ShieldAlert, User, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateTeam, deleteTeam } from "@/actions/team.actions";
import { TransferOwnershipConfirmModal } from "@/components/shared/transfer-ownership-confirm-modal";
import { useDialogFocus } from "@/lib/use-dialog-focus";

interface TeamData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  visibility: string;
  category_ids: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MemberInfo {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
}

interface TeamSettingsDialogProps {
  team: TeamData;
  categories: Category[];
  canDelete: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentUserId: string | null;
  members: MemberInfo[];
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

export function TeamSettingsDialog({ team, categories, canDelete, open: controlledOpen, onOpenChange, currentUserId, members }: TeamSettingsDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [activeTab, setActiveTab] = useState<"general" | "delete">("general");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  const [name, setName] = useState(team.name);
  const [slug, setSlug] = useState(team.slug);
  const [description, setDescription] = useState(team.description ?? "");
  const [visibility, setVisibility] = useState(team.visibility);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(team.category_ids);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();
  const [transferTarget, setTransferTarget] = useState<MemberInfo | null>(null);

  const eligibleMembers = canDelete && members
    ? members.filter((m) => m.id !== currentUserId && m.role !== "owner")
    : [];

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("team_id", team.id);
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("description", description);
    formData.set("visibility", visibility);
    formData.set("category_ids", JSON.stringify(selectedCategoryIds));
    formData.set("_current_slug", team.slug);

    startTransition(async () => {
      const result = await updateTeam(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    const formData = new FormData();
    formData.set("team_id", team.id);
    startDeleteTransition(async () => {
      const result = await deleteTeam(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else if (result && "success" in result && result.success && result.redirectTo) {
        router.refresh();
        router.push(result.redirectTo);
      }
    });
  }

  const tabs = [
    { id: "general" as const, label: "General" },
    ...(canDelete ? [{ id: "delete" as const, label: "Delete" }] : []),
  ];

  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
        <Settings size={14} />
        Settings
      </Button>

      {transferTarget ? (
        <TransferOwnershipConfirmModal
          open={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          type="team"
          resourceName={team.name}
          targetMember={transferTarget}
          resourceId={team.id}
          slug={team.slug}
        />
      ) : null}

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Team settings"
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={() => setOpen(false)}
              />

              <div
                ref={dialogFocusRef}
                tabIndex={-1}
                className="relative z-10 flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Team Settings</h2>
                    <p className="mt-1 text-sm text-ink-400">Manage your team configuration.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex border-b border-border px-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                        activeTab === tab.id
                          ? "border-accent-400 text-accent-300"
                          : "border-transparent text-ink-400 hover:text-ink-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  {activeTab === "general" ? (
                    <form onSubmit={handleSave} className="space-y-6">
                      <div>
                        <label htmlFor="settings-name" className={labelClass}>
                          Team Name
                        </label>
                        <input
                          id="settings-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          maxLength={100}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="settings-slug" className={labelClass}>
                          Slug
                        </label>
                        <input
                          id="settings-slug"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          required
                          maxLength={80}
                          pattern="[a-z0-9-]+"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="settings-description" className={labelClass}>
                          Description
                        </label>
                        <textarea
                          id="settings-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          maxLength={500}
                          rows={4}
                          className={`${inputClass} resize-none`}
                        />
                        <p className="mt-1.5 text-xs text-ink-500">{description.length}/500</p>
                      </div>

                      <div>
                        <label className={labelClass}>Visibility</label>
                        <div className="mt-2 flex gap-4">
                          {(["public", "private"] as const).map((opt) => (
                            <label
                              key={opt}
                              className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm text-ink-300 transition-all duration-300 ease-premium hover:border-accent-400/40 hover:bg-surface-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-accent-400 has-[:checked]:border-accent-400/40 has-[:checked]:bg-accent/[0.04] has-[:checked]:text-ink-50"
                            >
                              <input
                                type="radio"
                                value={opt}
                                checked={visibility === opt}
                                onChange={(e) => setVisibility(e.target.value)}
                                className="h-4 w-4 accent-accent-400"
                              />
                              {opt === "public" ? "Public" : "Private"}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Categories</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {categories.map((cat) => {
                            const active = selectedCategoryIds.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() =>
                                  setSelectedCategoryIds((prev) =>
                                    active
                                      ? prev.filter((id) => id !== cat.id)
                                      : [...prev, cat.id]
                                  )
                                }
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                  active
                                    ? "bg-accent text-white"
                                    : "border border-border-strong text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                                }`}
                              >
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {canDelete ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
                          <div className="flex items-center gap-3">
                            <ShieldAlert size={20} className="shrink-0 text-amber-400" />
                            <div>
                              <p className="font-medium text-amber-300">Transfer Ownership</p>
                              <p className="mt-0.5 text-sm text-amber-200/70">
                                Transfer ownership of this team to another member. You will become an administrator after the transfer.
                              </p>
                            </div>
                          </div>

                          {eligibleMembers.length > 0 ? (
                            <div className="mt-4 space-y-2">
                              {eligibleMembers.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-border-strong bg-surface px-4 py-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border-strong/[0.1]">
                                      {member.avatar_url ? (
                                        <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500 to-accent-400 text-sm font-semibold text-white">
                                          {(member.full_name?.[0] || member.username?.[0] || "U").toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-ink-50">
                                        {member.full_name || member.username || "Unknown"}
                                      </p>
                                      <p className="truncate text-xs text-ink-500">
                                        {member.username ? `@${member.username}` : ""}
                                        <span className="ml-2 capitalize text-ink-400">{member.role}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setTransferTarget(member)}
                                  >
                                    Transfer
                                    <ArrowRight size={13} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-ink-500">There is nobody to transfer ownership to.</p>
                          )}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setOpen(false)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                          {isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  ) : null}

                  {activeTab === "delete" ? (
                    <div className="space-y-6">
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={20} className="shrink-0 text-red-400" />
                          <div>
                            <p className="font-medium text-red-300">Danger Zone</p>
                            <p className="mt-1 text-sm text-red-200/70">
                              This action is irreversible. The team, all memberships, open roles, and associated data will be permanently deleted.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
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
                        className="w-full bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-500/60"
                        disabled={deleteConfirm !== team.name || deletePending}
                        onClick={handleDelete}
                      >
                        {deletePending ? "Deleting..." : `Delete "${team.name}"`}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
