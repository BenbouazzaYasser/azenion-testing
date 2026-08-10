"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Users, MapPin, Building2, X, AlertTriangle, ShieldCheck, UserPlus, UserX, Check, ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { createBranch, updateBranch, deleteBranch, assignBranchLeader, removeBranchLeader, uploadBranchLogoAsset } from "@/actions/branch.actions";

interface BranchLeader {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ProfileOption {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface BranchItem {
  id: string;
  slug: string;
  name: string;
  full_name: string | null;
  description: string | null;
  city: string | null;
  logo_url: string | null;
  member_count: number;
  leaders: BranchLeader[];
}

interface BranchManageClientProps {
  branches: BranchItem[];
  profiles: ProfileOption[];
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

export function BranchManageClient({ branches, profiles }: BranchManageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formInstitution, setFormInstitution] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignQuery, setAssignQuery] = useState("");
  const [assignConfirm, setAssignConfirm] = useState<string | null>(null);

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormInstitution("");
    setFormCity("");
    setFormDescription("");
    setFormLogoUrl("");
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUploading(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
    setEditingId(null);
    setShowForm(false);
  }

  function openEdit(branch: BranchItem) {
    setFormName(branch.name);
    setFormSlug(branch.slug);
    setFormInstitution(branch.full_name ?? "");
    setFormCity(branch.city ?? "");
    setFormDescription(branch.description ?? "");
    setFormLogoUrl(branch.logo_url ?? "");
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUploading(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
    setEditingId(branch.id);
    setShowForm(true);
    setError(null);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setLogoUploading(true);
    setError(null);
    const uploadFd = new FormData();
    uploadFd.set("logo", file);

    const result = await uploadBranchLogoAsset(uploadFd);
    setLogoUploading(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      setLogoPreview(null);
      setLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }
    if (result && "success" in result && result.logo_url) {
      setFormLogoUrl(result.logo_url);
    }
  }

  function handleRemoveLogo() {
    setFormLogoUrl("");
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function handleNameChange(value: string) {
    setFormName(value);
    if (!editingId && (!formSlug || formSlug === formName.toLowerCase().replace(/[^a-z0-9-]/g, ""))) {
      setFormSlug(
        value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
      );
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("name", formName);
    fd.set("slug", formSlug);
    fd.set("institution", formInstitution);
    fd.set("city", formCity);
    fd.set("description", formDescription);
    fd.set("logo_url", formLogoUrl);

    if (editingId) {
      fd.set("branch_id", editingId);
    }

    startTransition(async () => {
      const result = editingId ? await updateBranch(fd) : await createBranch(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(branchId: string) {
    setError(null);
    const fd = new FormData();
    fd.set("branch_id", branchId);

    startTransition(async () => {
      const result = await deleteBranch(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setShowDelete(null);
        setDeleteConfirm("");
      }
    });
  }

  function handleAssignLeader(branchId: string, userId: string) {
    setError(null);
    const fd = new FormData();
    fd.set("branch_id", branchId);
    fd.set("user_id", userId);

    startTransition(async () => {
      const result = await assignBranchLeader(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setAssignFor(null);
      setAssignQuery("");
      router.refresh();
    });
  }

  function handleRemoveLeader(branchId: string, userId: string) {
    setError(null);
    const fd = new FormData();
    fd.set("branch_id", branchId);
    fd.set("user_id", userId);

    startTransition(async () => {
      const result = await removeBranchLeader(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function matchingProfiles(branch: BranchItem) {
    const leaderIds = new Set(branch.leaders.map((m) => m.id));
    const q = assignQuery.trim().toLowerCase();
    return profiles
      .filter((p) => !leaderIds.has(p.id))
      .filter((p) => {
        if (!q) return true;
        return (
          p.username.toLowerCase().includes(q) ||
          (p.full_name ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }

  return (
    <section className="relative overflow-hidden pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      <BackgroundInfinity variant="teams" />

      <div className="relative mx-auto max-w-[960px] px-5 pb-28 pt-16 sm:px-8 sm:pt-20 lg:pb-36 lg:pt-24">
        <Reveal>
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                Administration
              </div>
              <h1 className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]">
                Manage Branches
              </h1>
              <p className="mt-3 text-sm text-ink-400">
                Create, edit, and delete campus branches.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus size={14} />
              Create Branch
            </Button>
          </div>
        </Reveal>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {showForm ? (
          <Reveal delay={80}>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border-strong card-surface p-8 shadow-card backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-50">
                  {editingId ? "Edit Branch" : "Create Branch"}
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="branch-name" className={labelClass}>
                      Name <span className="text-accent-400">*</span>
                    </label>
                    <input
                      id="branch-name"
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      maxLength={100}
                      placeholder="e.g. EMSI"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="branch-slug" className={labelClass}>
                      Slug <span className="text-accent-400">*</span>
                    </label>
                    <input
                      id="branch-slug"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      required
                      maxLength={80}
                      pattern="[a-z0-9-]+"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="branch-institution" className={labelClass}>
                      Institution
                    </label>
                    <input
                      id="branch-institution"
                      value={formInstitution}
                      onChange={(e) => setFormInstitution(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. École Marocaine des Sciences de l'Ingénieur"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="branch-city" className={labelClass}>
                      City
                    </label>
                    <input
                      id="branch-city"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Rabat"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="branch-description" className={labelClass}>
                    Description
                  </label>
                  <textarea
                    id="branch-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div>
                  <label htmlFor="branch-logo" className={labelClass}>
                    Branch Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent-400/30 bg-accent/[0.08]">
                      {logoPreview || formLogoUrl ? (
                        <img
                          src={logoPreview ?? formLogoUrl}
                          alt="Branch logo preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-accent-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploading}
                        >
                          {logoUploading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ImagePlus size={14} />
                          )}
                          {logoUploading
                            ? "Uploading..."
                            : formLogoUrl
                              ? "Replace logo"
                              : "Upload logo"}
                        </Button>
                        {formLogoUrl || logoPreview ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleRemoveLogo}
                            className="border-red-500/30 text-red-400 hover:border-red-400/60 hover:bg-red-500/[0.08] hover:text-red-300"
                          >
                            <Trash2 size={14} />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-ink-500">
                        PNG, JPEG, WebP, or SVG. Max 2MB. Stored in Azenion storage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-border pt-5">
                  <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                    {isPending ? "Saving..." : editingId ? "Save Changes" : "Create Branch"}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={resetForm} disabled={isPending}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Reveal>
        ) : null}

        <div className="mt-10 grid gap-5">
          {branches.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong bg-surface text-accent-300">
                <Building2 className="h-6 w-6 text-accent-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-200">No branches yet</p>
                <p className="mt-1 text-sm text-ink-600">Create the first one to get started.</p>
              </div>
            </div>
          ) : (
            branches.map((branch, i) => (
              <Reveal key={branch.id} delay={i * 80}>
                <div className="group relative flex items-start gap-5 overflow-hidden rounded-2xl border border-border-strong card-surface p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] p-2.5">
                    {branch.logo_url ? (
                      <img src={branch.logo_url} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-accent-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="truncate text-[1rem] font-semibold text-ink-50">
                        {branch.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(branch)}
                          className="rounded-lg border border-border-strong bg-surface p-2 text-ink-400 transition-colors hover:bg-surface-hover hover:text-accent-400"
                          aria-label={`Edit ${branch.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDelete(branch.id);
                            setDeleteConfirm("");
                            setError(null);
                          }}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                          aria-label={`Delete ${branch.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-400">
                      {branch.full_name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={13} className="text-accent-400" />
                          {branch.full_name}
                        </span>
                      ) : null}
                      {branch.city ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} className="text-accent-400" />
                          {branch.city}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={13} className="text-accent-400" />
                        {branch.member_count} {branch.member_count === 1 ? "member" : "members"}
                      </span>
                      <span className="text-sm text-ink-500">/{branch.slug}</span>
                    </div>
                    {branch.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-500">
                        {branch.description}
                      </p>
                    ) : null}

                    {/* Leaders */}
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck size={13} className="text-emerald-400" />
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-500">
                          Leaders
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignFor(assignFor === branch.id ? null : branch.id);
                            setAssignQuery("");
                            setError(null);
                          }}
                          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-ink-400 transition-colors hover:bg-surface-hover hover:text-accent-400"
                        >
                          <UserPlus size={12} />
                          {assignFor === branch.id ? "Close" : "Assign"}
                        </button>
                      </div>

                      {branch.leaders.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {branch.leaders.map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-1 text-xs text-emerald-300"
                            >
                              <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white/10">
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500 to-accent-400 text-[9px] font-semibold text-white">
                                    {(m.full_name?.[0] || m.username?.[0] || "M").toUpperCase()}
                                  </span>
                                )}
                              </span>
                              {m.full_name || `@${m.username}`}
                              <button
                                type="button"
                                aria-label={`Remove ${m.username}`}
                                onClick={() => handleRemoveLeader(branch.id, m.id)}
                                disabled={isPending}
                                className="rounded-full p-0.5 text-emerald-400/60 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-ink-600">No leaders assigned yet.</p>
                      )}

                      {assignFor === branch.id ? (
                        <div className="mt-3">
                          <div className="relative">
                            <input
                              value={assignQuery}
                              onChange={(e) => setAssignQuery(e.target.value)}
                              placeholder="Search by username or name..."
                              className={`${inputClass} py-2.5 pr-9 text-sm`}
                            />
                            <UserPlus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600" />
                          </div>
                          <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border-strong bg-surface p-1.5">
                            {matchingProfiles(branch).length === 0 ? (
                              <p className="px-3 py-2 text-xs text-ink-600">
                                {profiles.length === 0
                                  ? "No users available to assign."
                                  : "No matching users."}
                              </p>
                            ) : (
                              matchingProfiles(branch).map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setAssignConfirm(assignConfirm === p.id ? null : p.id);
                                  }}
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-300 transition-colors hover:bg-surface-hover"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10">
                                      {p.avatar_url ? (
                                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500 to-accent-400 text-[9px] font-semibold text-white">
                                          {(p.full_name?.[0] || p.username?.[0] || "U").toUpperCase()}
                                        </span>
                                      )}
                                    </span>
                                    <span className="truncate">
                                      {p.full_name || `@${p.username}`}
                                      {p.full_name ? (
                                        <span className="ml-1.5 text-xs text-ink-600">@{p.username}</span>
                                      ) : null}
                                    </span>
                                  </span>
                                  {assignConfirm === p.id ? (
                                    <Check size={14} className="shrink-0 text-accent-400" />
                                  ) : null}
                                </button>
                              ))
                            )}
                          </div>
                          {assignConfirm ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              className="mt-2"
                              disabled={isPending}
                              onClick={() => handleAssignLeader(branch.id, assignConfirm)}
                            >
                              {isPending ? "Assigning..." : "Assign Leader"}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {showDelete === branch.id ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-void-950/92 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                        <AlertTriangle size={24} className="text-red-400" />
                        <div>
                          <p className="font-medium text-ink-50">Delete {branch.name}?</p>
                          <p className="mt-1 text-sm text-ink-400">
                            Type <span className="font-bold text-red-400">{branch.name}</span> to confirm
                          </p>
                        </div>
                        <input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder={branch.name}
                          className={`${inputClass} max-w-xs`}
                        />
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setShowDelete(null);
                              setDeleteConfirm("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-500/60"
                            disabled={deleteConfirm !== branch.name || isPending}
                            onClick={() => handleDelete(branch.id)}
                          >
                            {isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Reveal>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
