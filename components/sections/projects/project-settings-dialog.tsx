"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Settings,
  AlertTriangle,
  ShieldAlert,
  Globe,
  Lock,
  UserPlus,
  User,
  Link as LinkIcon,
  Github,
  Save,
  ImagePlus,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TechTagInput } from "./tech-tag-input";
import { RecruitmentEditor, type RecruitmentRole } from "./recruitment-editor";
import { deleteProject, updateProjectSettings, uploadProjectLogo } from "@/actions/project.actions";
import { TransferOwnershipConfirmModal } from "@/components/shared/transfer-ownership-confirm-modal";
import { useDialogFocus } from "@/lib/use-dialog-focus";

interface ProjectSettingsData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  description_long: string | null;
  logo_url: string | null;
  visibility: string;
  website: string | null;
  github_url: string | null;
  technologies: string[];
  recruitment: RecruitmentRole[];
  category_ids: string[];
  team: { name: string; slug: string } | null;
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

interface ProjectSettingsDialogProps {
  project: ProjectSettingsData;
  allCategories: Category[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentUserId: string | null;
  members: MemberInfo[];
}

const cardClass =
  "rounded-2xl card-surface p-6 shadow-card backdrop-blur-xl sm:p-8";
const inputClass =
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";
const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";
const sectionTitleClass = "text-lg font-semibold text-ink-50";

const VISIBILITY_OPTIONS = [
  {
    value: "open",
    icon: Globe,
    label: "Open",
    desc: "Anyone can discover and join.",
    color: "border-accent/25 bg-accent/[0.08] text-accent-300",
  },
  {
    value: "private",
    icon: Lock,
    label: "Private",
    desc: "Hidden from everyone except members.",
    color: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
  },
  {
    value: "invite_only",
    icon: UserPlus,
    label: "Invite Only",
    desc: "Visible publicly but requires an invitation.",
    color: "border-purple-400/25 bg-purple-400/[0.08] text-purple-300",
  },
];

export function ProjectSettingsDialog({ project, allCategories, open: controlledOpen, onOpenChange, currentUserId, members }: ProjectSettingsDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [description, setDescription] = useState(project.description ?? "");
  const [descriptionLong, setDescriptionLong] = useState(project.description_long ?? "");
  const [website, setWebsite] = useState(project.website ?? "");
  const [githubUrl, setGithubUrl] = useState(project.github_url ?? "");
  const [technologies, setTechnologies] = useState<string[]>(project.technologies ?? []);
  const [recruitment, setRecruitment] = useState<RecruitmentRole[]>(project.recruitment ?? []);
  const [visibility, setVisibility] = useState(project.visibility);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(project.category_ids ?? []);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();
  const [transferTarget, setTransferTarget] = useState<MemberInfo | null>(null);

  const eligibleMembers = members
    ? members.filter((m) => m.id !== currentUserId && m.role !== "owner")
    : [];
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  function resetState() {
    setName(project.name);
    setSlug(project.slug);
    setDescription(project.description ?? "");
    setDescriptionLong(project.description_long ?? "");
    setWebsite(project.website ?? "");
    setGithubUrl(project.github_url ?? "");
    setTechnologies(project.technologies ?? []);
    setRecruitment(project.recruitment ?? []);
    setSelectedCategoryIds(project.category_ids ?? []);
    setVisibility(project.visibility);
    setDeleteConfirm("");
    setError(null);
  }

  const hasChanges =
    name !== project.name ||
    slug !== project.slug ||
    description !== (project.description ?? "") ||
    descriptionLong !== (project.description_long ?? "") ||
    website !== (project.website ?? "") ||
    githubUrl !== (project.github_url ?? "") ||
    visibility !== project.visibility ||
    JSON.stringify(technologies) !== JSON.stringify(project.technologies ?? []) ||
    JSON.stringify(recruitment) !== JSON.stringify(project.recruitment ?? []) ||
    JSON.stringify(selectedCategoryIds) !== JSON.stringify(project.category_ids ?? []);

  function handleSave() {
    setError(null);
    const fd = new FormData();
    fd.set("project_id", project.id);
    fd.set("slug", slug);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("description_long", descriptionLong);
    fd.set("website", website);
    fd.set("github_url", githubUrl);
    fd.set("visibility", visibility);
    fd.set("technologies", JSON.stringify(technologies));
    fd.set("recruitment", JSON.stringify(recruitment));
    fd.set("category_ids", JSON.stringify(selectedCategoryIds));

    startTransition(async () => {
      const result = await updateProjectSettings(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    const fd = new FormData();
    fd.set("project_id", project.id);
    startDeleteTransition(async () => {
      const result = await deleteProject(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else if (result && "success" in result && result.success && result.redirectTo) {
        router.refresh();
        router.push(result.redirectTo);
      }
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLogoUploading(true);

    const fd = new FormData();
    fd.set("project_id", project.id);
    fd.set("logo", file);
    fd.set("slug", project.slug);

    const result = await uploadProjectLogo(fd);
    setLogoUploading(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
        <Settings size={14} />
        Settings
      </Button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Project settings"
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={() => {
                  resetState();
                  setOpen(false);
                }}
              />

              <div
                ref={dialogFocusRef}
                tabIndex={-1}
                className="relative z-10 flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Project Settings</h2>
                    <p className="mt-1 text-sm text-ink-400">Manage your project configuration.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                      setOpen(false);
                    }}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-8">
                  {error ? (
                    <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-10">
                    {/* ── 1. General Information ── */}
                    <div className={cardClass}>
                      <h3 className={sectionTitleClass}>General Information</h3>
                      <p className="mt-1 text-sm text-ink-400">Basic project details.</p>

                      <div className="mt-6 grid gap-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor="ps-name" className={labelClass}>Project Name</label>
                            <input
                              id="ps-name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              maxLength={100}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label htmlFor="ps-slug" className={labelClass}>Slug</label>
                            <input
                              id="ps-slug"
                              value={slug}
                              onChange={handleSlugChange}
                              maxLength={80}
                              pattern="[a-z0-9-]+"
                              className={inputClass}
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="ps-desc" className={labelClass}>Short Description</label>
                          <textarea
                            id="ps-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={1000}
                            rows={2}
                            className={`${inputClass} resize-none`}
                          />
                        </div>

                        <div>
                          <label htmlFor="ps-desc-long" className={labelClass}>Full Description</label>
                          <textarea
                            id="ps-desc-long"
                            value={descriptionLong}
                            onChange={(e) => setDescriptionLong(e.target.value)}
                            rows={5}
                            className={`${inputClass} resize-none`}
                          />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor="ps-website" className={labelClass}>
                              <span className="inline-flex items-center gap-1.5">
                                <LinkIcon size={14} /> Website
                              </span>
                            </label>
                            <input
                              id="ps-website"
                              value={website}
                              onChange={(e) => setWebsite(e.target.value)}
                              placeholder="https://"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label htmlFor="ps-github" className={labelClass}>
                              <span className="inline-flex items-center gap-1.5">
                                <Github size={14} /> GitHub Repository
                              </span>
                            </label>
                            <input
                              id="ps-github"
                              value={githubUrl}
                              onChange={(e) => setGithubUrl(e.target.value)}
                              placeholder="https://github.com/..."
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── 2. Categories ── */}
                    {allCategories.length > 0 ? (
                      <div className={cardClass}>
                        <h3 className={sectionTitleClass}>Categories</h3>
                        <p className="mt-1 text-sm text-ink-400">
                          Categorize your project to make it discoverable.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {allCategories.map((cat) => {
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
                                    : " text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                                }`}
                              >
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* ── 3. Technologies ── */}
                    <div className={cardClass}>
                      <h3 className={sectionTitleClass}>Technologies</h3>
                      <p className="mt-1 text-sm text-ink-400">
                        Technologies used in this project. Press Enter to add.
                      </p>
                      <div className="mt-6">
                        <TechTagInput tags={technologies} onChange={setTechnologies} />
                      </div>
                    </div>

                    {/* ── 3. Recruitment ── */}
                    <div className={cardClass}>
                      <h3 className={sectionTitleClass}>Recruitment</h3>
                      <p className="mt-1 text-sm text-ink-400">
                        Define roles you&apos;re looking for.
                      </p>
                      <div className="mt-6">
                        <RecruitmentEditor roles={recruitment} onChange={setRecruitment} />
                      </div>
                    </div>

                    {/* ── 4. Visibility ── */}
                    <div className={cardClass}>
                      <h3 className={sectionTitleClass}>Visibility</h3>
                      <p className="mt-1 text-sm text-ink-400">Control who can see and join this project.</p>
                      <div className="mt-6 grid gap-5 sm:grid-cols-3">
                        {VISIBILITY_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const selected = visibility === opt.value;
                          return (
                            <label
                              key={opt.value}
                              className={`relative flex cursor-pointer flex-col gap-3 rounded-xl border p-5 transition-all duration-300 ease-premium focus-within:outline-none focus-within:ring-2 focus-within:ring-accent-400 ${
                                selected
                                  ? "border-accent-400/40 bg-accent/[0.04]"
                                  : "border-border-strong bg-surface hover:border-accent-400/30 hover:bg-surface-hover"
                              }`}
                            >
                              <input
                                type="radio"
                                value={opt.value}
                                checked={selected}
                                onChange={(e) => setVisibility(e.target.value)}
                                className="sr-only"
                              />
                              <div className="flex items-center gap-2">
                                <Icon size={16} className={opt.color.split(" ").pop()} />
                                <span className={`text-sm font-medium ${selected ? "text-ink-50" : "text-ink-300"}`}>
                                  {opt.label}
                                </span>
                              </div>
                              <p className="text-xs text-ink-500">{opt.desc}</p>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── 5. Team ── */}
                    <div className={cardClass}>
                      <h3 className={sectionTitleClass}>Team</h3>
                      <p className="mt-1 text-sm text-ink-400">The team this project belongs to.</p>
                      <div className="mt-6">
                        {project.team ? (
                          <div className="flex items-center justify-between rounded-xl bg-surface px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
                                <Building2 size={18} className="text-accent-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-ink-200">{project.team.name}</p>
                                <p className="text-xs text-ink-500">Current Team</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/teams/${project.team.slug}`}>
                                View Team
                                <ArrowUpRight size={12} />
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-ink-500">No team attached.</p>
                        )}
                      </div>
                    </div>

                    {/* ── 6. Branding ── */}
                    <div className={cardClass}>
                      <h3 className={sectionTitleClass}>Branding</h3>
                      <p className="mt-1 text-sm text-ink-400">Project logo and visual identity.</p>
                      <div className="mt-6 flex items-start gap-6">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08] p-3">
                          {project.logo_url ? (
                            <img src={project.logo_url} alt="" className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            <ImagePlus size={28} className="text-accent-400" />
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={logoUploading}
                          >
                            <ImagePlus size={14} />
                            {logoUploading ? "Uploading..." : project.logo_url ? "Replace Logo" : "Upload Logo"}
                          </Button>
                          {project.logo_url ? (
                            <p className="text-xs text-ink-500">Upload a new image to replace the current logo.</p>
                          ) : (
                            <p className="text-xs text-ink-500">PNG, JPEG, or WebP. Max 2MB.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── 7. Transfer Ownership ── */}
                    <div className="rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.04),rgba(245,158,11,0.01))] p-6 shadow-card backdrop-blur-xl sm:p-8">
                      <div className="flex items-center gap-3">
                        <ShieldAlert size={20} className="shrink-0 text-amber-400" />
                        <div>
                          <h3 className="text-lg font-semibold text-amber-300">Transfer Ownership</h3>
                          <p className="mt-0.5 text-sm text-amber-200/70">
                            Transfer ownership of this project to another member. You will become an administrator after the transfer.
                          </p>
                        </div>
                      </div>

                      {eligibleMembers.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {eligibleMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
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
                                <ArrowUpRight size={13} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-ink-500">There is nobody to transfer ownership to.</p>
                      )}
                    </div>

                    {/* ── 8. Danger Zone ── */}
                    <div className="rounded-2xl border border-red-500/25 bg-[linear-gradient(135deg,rgba(220,38,38,0.06),rgba(220,38,38,0.02))] p-6 shadow-card backdrop-blur-xl sm:p-8">
                      <h3 className={`${sectionTitleClass} text-red-300`}>Danger Zone</h3>
                      <p className="mt-1 text-sm text-red-200/70">
                        This action is irreversible. The project, all memberships, and associated data will be permanently deleted.
                      </p>
                      <div className="mt-6">
                        <label htmlFor="delete-confirm-project" className="mb-2 block text-sm font-medium text-ink-200">
                          Type <span className="font-bold text-red-400">{project.name}</span> to confirm
                        </label>
                        <input
                          id="delete-confirm-project"
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder={project.name}
                          className={inputClass}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-4 w-full bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-500/60"
                        disabled={deleteConfirm !== project.name || deletePending}
                        onClick={handleDelete}
                      >
                        {deletePending ? "Deleting..." : `Delete "${project.name}"`}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ── Sticky footer with Save ── */}
                {hasChanges ? (
                  <div className="flex items-center justify-between border-t border-border bg-void-950/95 px-8 py-4">
                    <span className="flex items-center gap-2 text-sm text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Unsaved changes
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleSave}
                      disabled={isPending}
                    >
                      <Save size={14} />
                      {isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {transferTarget ? (
        <TransferOwnershipConfirmModal
          open={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          type="project"
          resourceName={project.name}
          targetMember={transferTarget}
          resourceId={project.id}
          slug={project.slug}
        />
      ) : null}
    </>
  );
}
