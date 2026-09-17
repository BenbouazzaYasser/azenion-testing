"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { AvatarUpload } from "./avatar-upload";
import { updateProfile } from "@/actions/profile.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { useTranslation } from "@/components/translation/translation-provider";

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
  "w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950";

const GITHUB_HOSTS = ["github.com", "www.github.com"];
const LINKEDIN_HOSTS = ["linkedin.com", "www.linkedin.com", "linkedin.in", "www.linkedin.in"];

function isValidUrl(str: string) {
  try { new URL(str); return true; } catch { return false; }
}

function getHost(str: string) {
  try { return new URL(str).hostname.toLowerCase(); } catch { return ""; }
}

function DialogContent({
  profile,
  onClose,
}: {
  profile: EditProfileDialogProps["profile"];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(true);
  const [error, setError] = useState<string | null>(null);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUrlWarning(null);
    const formData = new FormData(e.currentTarget);
    const githubRaw = (formData.get("github_url") as string ?? "").trim();
    const linkedinRaw = (formData.get("linkedin_url") as string ?? "").trim();
    if (githubRaw && isValidUrl(githubRaw)) {
      const host = getHost(githubRaw);
      if (!GITHUB_HOSTS.includes(host)) {
        setUrlWarning(t("settings.urlWarningGithubOther"));
        return;
      }
    }
    if (linkedinRaw && isValidUrl(linkedinRaw)) {
      const host = getHost(linkedinRaw);
      if (!LINKEDIN_HOSTS.includes(host)) {
        setUrlWarning(t("settings.urlWarningLinkedinOther"));
        return;
      }
    }
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.editProfile")}
    >
      <button
        type="button"
        aria-label={t("settings.closeAria")}
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onClose}
      />

      <div
        ref={dialogFocusRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[85vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.95)",
        }}
      >
        <div className="flex items-start justify-between border-b border-border px-10 py-6">
          <div>
            <h2 className="text-xl font-semibold text-ink-50">{t("settings.editProfile")}</h2>
            <p className="mt-1 text-sm text-ink-400">{t("settings.editProfileDesc")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("settings.closeAria")}
            className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
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
            {urlWarning ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{urlWarning}</span>
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
                <FormField label={t("settings.fullName")} htmlFor="profile-full-name" required>
                  <input
                    id="profile-full-name"
                    name="full_name"
                    defaultValue={profile.full_name}
                    required
                    maxLength={100}
                    className={inputClass}
                  />
                </FormField>
                <FormField
                  label={t("settings.username")}
                  htmlFor="profile-username"
                  helper={t("settings.usernameHint")}
                  required
                >
                  <input
                    id="profile-username"
                    name="username"
                    defaultValue={profile.username}
                    required
                    maxLength={30}
                    pattern="[a-zA-Z0-9_-]+"
                    title={t("settings.usernameHint")}
                    className={inputClass}
                  />
                </FormField>
              </div>

              <FormField
                label={t("settings.bio")}
                htmlFor="profile-bio"
                helper={t("settings.bioHelper")}
              >
                <textarea
                  id="profile-bio"
                  name="bio"
                  defaultValue={profile.bio ?? ""}
                  maxLength={500}
                  rows={5}
                  placeholder={t("settings.bioPlaceholder")}
                  className={`${inputClass} resize-none`}
                />
              </FormField>

              <FormField
                label={t("settings.institutionLabel")}
                htmlFor="profile-institution"
                helper={t("settings.institutionHelper")}
              >
                <input
                  id="profile-institution"
                  name="institution"
                  defaultValue={profile.institution ?? ""}
                  maxLength={100}
                  placeholder="e.g. EMSI Rabat"
                  className={inputClass}
                />
              </FormField>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="GitHub" htmlFor="profile-github">
                  <input
                    id="profile-github"
                    name="github_url"
                    type="url"
                    defaultValue={profile.github_url ?? ""}
                    placeholder="https://github.com/username"
                    className={inputClass}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val && isValidUrl(val) && !GITHUB_HOSTS.includes(getHost(val))) {
                        setUrlWarning(t("settings.urlWarningGithub"));
                      } else {
                        setUrlWarning(null);
                      }
                    }}
                  />
                </FormField>
                <FormField label="LinkedIn" htmlFor="profile-linkedin">
                  <input
                    id="profile-linkedin"
                    name="linkedin_url"
                    type="url"
                    defaultValue={profile.linkedin_url ?? ""}
                    placeholder="https://linkedin.com/in/username"
                    className={inputClass}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val && isValidUrl(val) && !LINKEDIN_HOSTS.includes(getHost(val))) {
                        setUrlWarning(t("settings.urlWarningLinkedin"));
                      } else {
                        setUrlWarning(null);
                      }
                    }}
                  />
                </FormField>
              </div>

              <FormField
                label={t("settings.skillsLabel")}
                htmlFor="profile-skills"
                helper={t("settings.skillsHelper")}
              >
                <input
                  id="profile-skills"
                  name="skills"
                  defaultValue={profile.skills.join(", ")}
                  placeholder="React, Figma, Product Strategy"
                  className={inputClass}
                />
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border px-10 py-5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              {t("settings.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending ? t("settings.savingDots") : t("settings.saveChanges")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("settings.editProfile")}
      </Button>

      {open
        ? createPortal(
            <DialogContent
              key={profile.id}
              profile={profile}
              onClose={() => setOpen(false)}
            />,
            document.body
          )
        : null}
    </>
  );
}