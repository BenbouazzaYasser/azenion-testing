"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBranch, uploadBranchLogoAsset } from "@/actions/branch.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";

interface BranchEditTarget {
  dbId: string;
  /** Short display name / acronym (maps to branches.name). */
  shortName: string;
  /** Full institution name (maps to branches.full_name). */
  name: string;
  slug: string;
  city: string;
  description: string;
  logo_url?: string | null;
  /** Display order in the showcase (lower = higher priority). */
  sortOrder?: number;
}

interface BranchEditDialogProps {
  branch: BranchEditTarget;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

export function BranchEditDialog({ branch, onClose }: BranchEditDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(true);

  const [name, setName] = useState(branch.shortName);
  const [slug, setSlug] = useState(branch.slug);
  const [institution, setInstitution] = useState(branch.name);
  const [city, setCity] = useState(branch.city);
  const [description, setDescription] = useState(branch.description);
  const [sortOrder, setSortOrder] = useState(String(branch.sortOrder ?? 0));
  const [logoUrl, setLogoUrl] = useState(branch.logo_url ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [onClose]);

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
      setLogoUrl(result.logo_url);
    }
  }

  function handleRemoveLogo() {
    setLogoUrl("");
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("branch_id", branch.dbId);
    fd.set("name", name);
    fd.set("slug", slug);
    fd.set("institution", institution);
    fd.set("city", city);
    fd.set("description", description);
    fd.set("logo_url", logoUrl);
    fd.set("sort_order", sortOrder);
    fd.set("_current_slug", branch.slug);

    startTransition(async () => {
      const result = await updateBranch(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
      toast.success("Branch updated.");
      router.refresh();
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Edit branch"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onClose}
      />

      <div
        ref={dialogFocusRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.95)",
        }}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-8">
          <div>
            <h2 className="text-xl font-semibold text-ink-50">Edit Branch</h2>
            <p className="mt-1 text-sm text-ink-400">Update this campus branch in the network.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          {error ? (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="branch-edit-name" className={labelClass}>
                  Name <span className="text-accent-400">*</span>
                </label>
                <input
                  id="branch-edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="e.g. EMSI"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="branch-edit-slug" className={labelClass}>
                  Slug <span className="text-accent-400">*</span>
                </label>
                <input
                  id="branch-edit-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  required
                  maxLength={80}
                  pattern="[a-z0-9-]+"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="branch-edit-institution" className={labelClass}>
                  Institution
                </label>
                <input
                  id="branch-edit-institution"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. École Marocaine des Sciences de l'Ingénieur"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="branch-edit-city" className={labelClass}>
                  City
                </label>
                <input
                  id="branch-edit-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Rabat"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="branch-edit-order" className={labelClass}>
                  Order
                </label>
                <input
                  id="branch-edit-order"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))
                  }
                  placeholder="e.g. 1"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-ink-500">
                  Lower values appear first in the branch list.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="branch-edit-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="branch-edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What makes this branch unique?"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label htmlFor="branch-edit-logo" className={labelClass}>
                Branch Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent-400/30 bg-accent/[0.08]">
                  {logoPreview || logoUrl ? (
                    <img
                      src={logoPreview ?? logoUrl}
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
                        : logoUrl
                          ? "Replace logo"
                          : "Upload logo"}
                    </Button>
                    {logoUrl || logoPreview ? (
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

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}