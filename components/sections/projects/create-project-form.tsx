"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { createProject } from "@/actions/project.actions";

interface TeamOption {
  team_id: string;
  role: string;
  team_slug: string;
  team_name: string;
  team_logo_url: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CreateProjectFormProps {
  teams: TeamOption[];
  categories: Category[];
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(109,109,255,0.15)]";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

export function CreateProjectForm({ teams, categories }: CreateProjectFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedTeam = searchParams.get("team");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const defaultTeamId = teams.length === 1 ? teams[0]!.team_id : "";
  const [teamId, setTeamId] = useState(preSelectedTeam ?? defaultTeamId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("open");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "")) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!teamId) {
      setError("Please select a team.");
      return;
    }

    const formData = new FormData();
    formData.set("team_id", teamId);
    const selectedTeam = teams.find((t) => t.team_id === teamId);
    formData.set("team_slug", selectedTeam?.team_slug ?? "");
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("description", description);
    formData.set("visibility", visibility);
    formData.set("category_ids", JSON.stringify(selectedCategoryIds));

    startTransition(async () => {
      const result = await createProject(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (result && "slug" in result) {
        router.push(`/projects/${result.slug}`);
      }
    });
  }

  return (
    <section className="relative overflow-hidden pb-24 pt-6 sm:pb-28 lg:pb-36">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

      <div className="mx-auto max-w-[640px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-card backdrop-blur-xl sm:p-10">
            {error ? (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-7">
              {teams.length > 1 ? (
                <div>
                  <label htmlFor="cp-team" className={labelClass}>
                    Team <span className="text-accent-400">*</span>
                  </label>
                  <select
                    id="cp-team"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    required
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="" disabled>Select a team</option>
                    {teams.map((t) => (
                      <option key={t.team_id} value={t.team_id} className="bg-void-950">
                        {t.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : teams.length === 1 ? (
                <div>
                  <label className={labelClass}>Team</label>
                  <div className="flex items-center gap-3 rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-200">
                    <Users size={16} className="text-accent-400" />
                    {teams[0]!.team_name}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
                  You need to be an owner or admin of a team to create a project.{" "}
                  <a href="/teams/create" className="underline hover:text-amber-200">
                    Create a team
                  </a>
                </div>
              )}

              <div>
                <label htmlFor="cp-name" className={labelClass}>
                  Project Name <span className="text-accent-400">*</span>
                </label>
                <input
                  id="cp-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="e.g. Azenion Mobile"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="cp-slug" className={labelClass}>
                  Slug <span className="text-accent-400">*</span>
                </label>
                <input
                  id="cp-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  required
                  maxLength={80}
                  pattern="[a-z0-9-]+"
                  className={inputClass}
                />
              </div>

              {categories.length > 0 ? (
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
              ) : null}

              <div>
                <label htmlFor="cp-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="cp-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="What does this project do?"
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-1.5 text-xs text-ink-500">{description.length}/1000</p>
              </div>

              <div>
                <label className={labelClass}>Visibility</label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(["open", "private", "invite_only"] as const).map((v) => (
                    <label
                      key={v}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-white/[0.02] px-4 py-3 text-sm text-ink-300 transition-all duration-300 has-[:checked]:border-accent-400/40 has-[:checked]:bg-accent/[0.04] has-[:checked]:text-ink-50"
                    >
                      <input
                        type="radio"
                        value={v}
                        checked={visibility === v}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="h-4 w-4 accent-accent-400"
                      />
                      {v === "open" ? "Open" : v === "private" ? "Private" : "Invite Only"}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={isPending || teams.length === 0}
                >
                  {isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
