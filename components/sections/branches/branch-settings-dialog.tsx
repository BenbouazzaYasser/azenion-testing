"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X, Settings, ImagePlus, Trash2, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateBranch, uploadBranchLogo } from "@/actions/branch.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";

interface BranchData {
  id: string;
  name: string;
  slug: string;
  full_name: string | null;
  description: string | null;
  city: string | null;
  logo_url: string | null;
}

interface BranchSettingsDialogProps {
  branch: BranchData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isPlatformAdmin?: boolean;
  canEditLogo?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

export function BranchSettingsDialog({ branch, open: controlledOpen, onOpenChange, isPlatformAdmin = false, canEditLogo = isPlatformAdmin }: BranchSettingsDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  const [name, setName] = useState(branch.name);
  const [slug, setSlug] = useState(branch.slug);
  const [institution, setInstitution] = useState(branch.full_name ?? "");
  const [city, setCity] = useState(branch.city ?? "");
  const [description, setDescription] = useState(branch.description ?? "");
  const [logoUrl, setLogoUrl] = useState(branch.logo_url ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(branch.name);
    setSlug(branch.slug);
    setInstitution(branch.full_name ?? "");
    setCity(branch.city ?? "");
    setDescription(branch.description ?? "");
    setLogoUrl(branch.logo_url ?? "");
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }, [branch]);

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
  }, [open, setOpen]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoUrl("");
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        const uploadFd = new FormData();
        uploadFd.set("branch_id", branch.id);
        uploadFd.set("slug", slug);
        uploadFd.set("logo", logoFile);

        const uploadResult = await uploadBranchLogo(uploadFd);
        if (uploadResult && "error" in uploadResult && uploadResult.error) {
          setError(uploadResult.error);
          return;
        }
        if (uploadResult && "success" in uploadResult && uploadResult.logo_url) {
          finalLogoUrl = uploadResult.logo_url;
        }
      }

      const fd = new FormData();
      fd.set("branch_id", branch.id);
      fd.set("name", name);
      fd.set("slug", slug);
      fd.set("institution", institution);
      fd.set("city", city);
      fd.set("description", description);
      fd.set("logo_url", finalLogoUrl);

      const result = await updateBranch(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setLogoFile(null);
      setLogoPreview(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" size="default" onClick={() => setOpen(true)}>
        <Settings size={14} />
        Settings
      </Button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Branch settings"
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
                className="relative z-10 flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border-strong/[0.08] panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Branch Settings</h2>
                    <p className="mt-1 text-sm text-ink-400">Manage this branch hub.</p>
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

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="branch-settings-name" className={labelClass}>
                          Name
                        </label>
                        <input
                          id="branch-settings-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          maxLength={100}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="branch-settings-slug" className={labelClass}>
                          Slug
                        </label>
                        <input
                          id="branch-settings-slug"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          required
                          maxLength={80}
                          pattern="[a-z0-9-]+"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="branch-settings-institution" className={labelClass}>
                        Institution
                      </label>
                      <input
                        id="branch-settings-institution"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        maxLength={200}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="branch-settings-city" className={labelClass}>
                        City
                      </label>
                      <input
                        id="branch-settings-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        maxLength={100}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="branch-settings-description" className={labelClass}>
                        Description
                      </label>
                      <textarea
                        id="branch-settings-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={4}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">{description.length}/500</p>
                    </div>

                    {canEditLogo ? (
                      <div>
                        <label className={labelClass}>Branch Logo</label>
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent-400/30 bg-accent/[0.08]">
                            {logoPreview || logoUrl ? (
                              <img
                                src={logoPreview ?? logoUrl}
                                alt="Branch logo"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <GitBranch className="h-7 w-7 text-accent-400" />
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
                              >
                                <ImagePlus size={14} />
                                {logoUrl ? "Replace logo" : "Upload logo"}
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
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
