"use client";

import { useState, useRef } from "react";
import { ImagePlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

const CATEGORIES = [
  "Software Development",
  "Artificial Intelligence",
  "Cybersecurity",
  "Design",
  "Entrepreneurship",
  "Research",
  "Other",
] as const;

const BRANCHES = ["EMSI", "FSR"] as const;

interface FormData {
  name: string;
  logo: string | null;
  category: string;
  visibility: "open" | "invite-only";
  description: string;
  originBranch: string;
}

function TeamPreviewCard({ data }: { data: FormData }) {
  const tags = [data.category];
  if (data.visibility === "open") tags.push("Open");
  if (data.originBranch) tags.push(data.originBranch);

  return (
    <div className="group overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium">
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08] p-3">
            {data.logo ? (
              <img src={data.logo} alt="Team logo" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <Users className="h-7 w-7 text-accent-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-white/[0.03] px-3 py-1 text-[11px] font-medium tracking-wide text-ink-200">
              {data.visibility === "open" ? "Open" : "Invite Only"}
            </div>
          </div>
        </div>

        <h3 className="mt-5 truncate text-xl font-semibold text-white sm:text-2xl">
          {data.name || "Your Team Name"}
        </h3>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/60">
          {data.description || "Your team description will appear here."}
        </p>

        {tags.some(Boolean) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.filter(Boolean).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] font-medium text-white/55"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateTeamForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    logo: null,
    category: "",
    visibility: "open",
    description: "",
    originBranch: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setLogoPreview(url);
      updateField("logo", url);
    };
    reader.readAsDataURL(file);
  }

  const inputBase =
    "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 backdrop-blur-xl transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30";

  const labelBase = "mb-1.5 block text-sm font-medium text-ink-200";

  return (
    <section className="relative overflow-hidden pb-28 pt-8 sm:pb-32 lg:pb-44">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          {/* Form */}
          <div>
            <Reveal>
              <div className="overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-card backdrop-blur-xl sm:p-10">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)]" />

                <div className="relative space-y-7">
                  {/* Team Name */}
                  <div>
                    <label htmlFor="team-name" className={labelBase}>
                      Team Name <span className="text-accent-400">*</span>
                    </label>
                    <input
                      id="team-name"
                      type="text"
                      placeholder="Enter your team name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className={inputBase}
                    />
                  </div>

                  {/* Team Logo */}
                  <div>
                    <label className={labelBase}>
                      Team Logo <span className="text-accent-400">*</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong bg-white/[0.02] px-5 py-8 text-ink-500 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.03] hover:text-ink-300"
                    >
                      <ImagePlus size={24} />
                      <span className="text-sm">
                        {logoPreview ? "Change logo" : "Upload team logo"}
                      </span>
                    </button>
                    {logoPreview && (
                      <div className="mt-3 flex items-center gap-3">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-12 w-12 rounded-xl border border-border-strong object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview(null);
                            updateField("logo", null);
                          }}
                          className="text-sm text-ink-500 transition-colors hover:text-accent-400"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="team-category" className={labelBase}>
                      Category <span className="text-accent-400">*</span>
                    </label>
                    <select
                      id="team-category"
                      value={formData.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className={inputBase + " appearance-none"}
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-void-950">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visibility */}
                  <fieldset>
                    <legend className={labelBase}>
                      Visibility <span className="text-accent-400">*</span>
                    </legend>
                    <div className="mt-2 flex gap-4">
                      {(["open", "invite-only"] as const).map((opt) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-white/[0.02] px-4 py-3 text-sm text-ink-300 transition-all duration-300 has-[:checked]:border-accent-400/40 has-[:checked]:bg-accent/[0.04] has-[:checked]:text-ink-50"
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={opt}
                            checked={formData.visibility === opt}
                            onChange={(e) =>
                              updateField("visibility", e.target.value as FormData["visibility"])
                            }
                            className="h-4 w-4 accent-accent-400"
                          />
                          {opt === "open" ? "Open" : "Invite Only"}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      {formData.visibility === "open"
                        ? "Anyone can request to join this team."
                        : "Only invited members may join this team."}
                    </p>
                  </fieldset>

                  {/* Description */}
                  <div>
                    <label htmlFor="team-description" className={labelBase}>
                      Description
                    </label>
                    <textarea
                      id="team-description"
                      rows={4}
                      placeholder="Tell people what your team is about..."
                      value={formData.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      className={inputBase + " resize-none"}
                    />
                  </div>

                  {/* Origin Branch */}
                  <div>
                    <label htmlFor="team-branch" className={labelBase}>
                      Origin Branch
                    </label>
                    <select
                      id="team-branch"
                      value={formData.originBranch}
                      onChange={(e) => updateField("originBranch", e.target.value)}
                      className={inputBase + " appearance-none"}
                    >
                      <option value="">None (independent team)</option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b} className="bg-void-950">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <Button type="submit" size="lg" className="w-full sm:w-auto">
                      Create Team
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Preview */}
          <div className="lg:pt-8">
            <div className="lg:sticky lg:top-32">
              <Reveal delay={120}>
                <p className="mb-5 text-xs font-medium uppercase tracking-[0.15em] text-ink-500">
                  Preview
                </p>
                <TeamPreviewCard data={formData} />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
