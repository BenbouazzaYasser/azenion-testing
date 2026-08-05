"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateTeam, uploadTeamLogo, uploadTeamBanner } from "@/actions/team.actions";
import type { TeamSettingsClientProps } from "./team-settings-client";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

function PermissionNotice({ permission }: { permission: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-3 text-sm text-ink-500">
      <Lock size={13} className="mr-1.5 inline -translate-y-px" />
      You need the <span className="font-medium text-ink-300">{permission}</span> permission to edit this.
    </div>
  );
}

export function SettingsOverviewTab({
  team,
  canEditInfo,
  canEditAppearance,
  categories,
  teamCategoryIds,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(team.name);
  const [slug, setSlug] = useState(team.slug);
  const [description, setDescription] = useState(team.description ?? "");
  const [visibility, setVisibility] = useState(team.visibility);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(teamCategoryIds);

  const [logoPending, startLogoTransition] = useTransition();
  const [bannerPending, startBannerTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
        toast.error(result.error);
        return;
      }
      toast.success("Team information saved.");
      router.refresh();
    });
  }

  function handleUpload(
    file: File | null,
    type: "logo" | "banner"
  ) {
    if (!file) return;
    const formData = new FormData();
    formData.set("team_id", team.id);
    formData.set("slug", team.slug);
    formData.set(type, file);

    const transition = type === "logo" ? startLogoTransition : startBannerTransition;
    transition(async () => {
      const result =
        type === "logo" ? await uploadTeamLogo(formData) : await uploadTeamBanner(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(type === "logo" ? "Logo updated." : "Banner updated.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      {canEditInfo ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 shadow-card backdrop-blur-xl sm:p-8">
          <h3 className="text-lg font-semibold text-ink-50">Team information</h3>
          <p className="mt-1 text-sm text-ink-400">
            Basic details shown across the platform.
          </p>

          {error ? (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
          </div>

          <div className="mt-5">
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

          <div className="mt-5">
            <label className={labelClass}>Visibility</label>
            <div className="mt-2 flex gap-4">
              {(["public", "private"] as const).map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-white/[0.02] px-4 py-3 text-sm text-ink-300 transition-all duration-300 has-[:checked]:border-accent-400/40 has-[:checked]:bg-accent/[0.04] has-[:checked]:text-ink-50"
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

          <div className="mt-5">
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
                        active ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
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

          <div className="mt-6 flex justify-end border-t border-border pt-5">
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              <Save size={14} />
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 shadow-card backdrop-blur-xl sm:p-8">
          <h3 className="text-lg font-semibold text-ink-50">Team information</h3>
          <p className="mt-3 text-sm text-ink-400">
            {team.name} — {team.description ?? "No description."}
          </p>
          <div className="mt-4">
            <PermissionNotice permission="EDIT_TEAM_INFORMATION" />
          </div>
        </div>
      )}

      {canEditAppearance ? (
        <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 shadow-card backdrop-blur-xl sm:p-8">
          <h3 className="text-lg font-semibold text-ink-50">Appearance</h3>
          <p className="mt-1 text-sm text-ink-400">Your team logo and banner image.</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-200">Logo</p>
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-border-strong bg-white/[0.02]">
                {team.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={team.logo_url} alt="Team logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500 to-accent-400 text-3xl font-semibold text-white">
                    {team.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files?.[0] ?? null, "logo");
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                disabled={logoPending}
                onClick={() => logoInputRef.current?.click()}
              >
                <ImagePlus size={14} />
                {logoPending ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-200">Banner</p>
              <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl border border-border-strong bg-white/[0.02]">
                {team.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={team.banner_url} alt="Team banner" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-ink-600">No banner yet</span>
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files?.[0] ?? null, "banner");
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                disabled={bannerPending}
                onClick={() => bannerInputRef.current?.click()}
              >
                <ImagePlus size={14} />
                {bannerPending ? "Uploading..." : "Upload Banner"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border-strong bg-white/[0.02] p-6 shadow-card backdrop-blur-xl sm:p-8">
          <h3 className="text-lg font-semibold text-ink-50">Appearance</h3>
          <div className="mt-4">
            <PermissionNotice permission="EDIT_TEAM_APPEARANCE" />
          </div>
        </div>
      )}
    </div>
  );
}
