"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "./avatar-upload";
import { updateProfile } from "@/actions/profile.actions";

interface EditProfileDialogProps {
  profile: {
    id: string;
    full_name: string;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    institution: string | null;
    skills: string[];
    github_url: string | null;
    linkedin_url: string | null;
  };
  branch: { name: string; slug: string } | null;
}

const inputClass =
  "w-full rounded-xl border border-border bg-white/[0.03] px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(109,109,255,0.15)]";

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit Profile
      </Button>

      {open ? (
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
              style={{ opacity: mounted ? 1 : 0 }}
              onClick={() => setOpen(false)}
            />

            <div
              className="relative z-10 flex max-h-[85vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(20,20,28,0.98),rgba(8,8,12,0.98))] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_30px_80px_-20px_rgba(40,40,255,0.15)] backdrop-blur-2xl transition-all duration-200 ease-premium"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "scale(1)" : "scale(0.95)",
              }}
            >
              <div className="flex items-start justify-between border-b border-border px-10 py-6">
                <div>
                  <h2 className="text-xl font-semibold text-ink-50">Edit Profile</h2>
                  <p className="mt-1 text-sm text-ink-400">Manage your public profile information.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-white/5 hover:text-ink-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-6 overflow-y-auto px-10 py-8">
                  {error ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <div className="flex justify-center sm:justify-start">
                    <AvatarUpload
                      avatarUrl={profile.avatar_url}
                      userId={profile.id}
                      username={profile.username}
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-ink-200">Full Name</span>
                        <input
                          name="full_name"
                          defaultValue={profile.full_name}
                          required
                          maxLength={100}
                          className={inputClass}
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-ink-200">Username</span>
                        <input
                          name="username"
                          defaultValue={profile.username}
                          required
                          maxLength={30}
                          pattern="[a-zA-Z0-9_-]+"
                          title="Letters, numbers, underscores, and hyphens only"
                          className={inputClass}
                        />
                        <p className="text-xs text-ink-600">Letters, numbers, underscores, and hyphens only.</p>
                      </label>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-ink-200">Bio</span>
                      <textarea
                        name="bio"
                        defaultValue={profile.bio ?? ""}
                        maxLength={500}
                        rows={5}
                        placeholder="Tell the network a bit about yourself"
                        className={`${inputClass} resize-none`}
                      />
                      <p className="text-xs text-ink-600">Brief description of your background and interests.</p>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-ink-200">Institution</span>
                      <input
                        name="institution"
                        defaultValue={profile.institution ?? ""}
                        maxLength={100}
                        placeholder="e.g. EMSI Rabat"
                        className={inputClass}
                      />
                      <p className="text-xs text-ink-600">Your school, university, or organization.</p>
                    </label>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-ink-200">GitHub</span>
                        <input
                          name="github_url"
                          type="url"
                          defaultValue={profile.github_url ?? ""}
                          placeholder="https://github.com/username"
                          className={inputClass}
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-ink-200">LinkedIn</span>
                        <input
                          name="linkedin_url"
                          type="url"
                          defaultValue={profile.linkedin_url ?? ""}
                          placeholder="https://linkedin.com/in/username"
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-ink-200">Skills</span>
                      <input
                        name="skills"
                        defaultValue={profile.skills.join(", ")}
                        placeholder="React, Figma, Product Strategy"
                        className={inputClass}
                      />
                      <p className="text-xs text-ink-600">Separate skills with commas.</p>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border px-10 py-5">
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
          </div>,
          document.body
        )
      ) : null}
    </>
  );
}
