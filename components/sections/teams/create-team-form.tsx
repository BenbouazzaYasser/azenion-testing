"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { ImagePlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { createClient } from "@/lib/supabase/client";
import { createTeam, uploadTeamLogo } from "@/actions/team.actions";

interface Category {
  id: string;
  name: string;
  slug: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TeamPreviewCard({
  name,
  description,
  logoPreview,
}: {
  name: string;
  description: string;
  logoPreview: string | null;
}) {
  return (
    <div className="group overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium">
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08] p-3">
            {logoPreview ? (
              <img src={logoPreview} alt="Team logo" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <Users className="h-7 w-7 text-accent-400" />
            )}
          </div>
        </div>

        <h3 className="mt-5 truncate text-xl font-semibold text-ink-50 sm:text-2xl">
          {name || "Your Team Name"}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-400">
          {description || "Your team description will appear here."}
        </p>
      </div>
    </div>
  );
}

export function CreateTeamForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("team_categories")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("description", description);
    formData.set("visibility", visibility);
    if (selectedCategoryIds.length > 0) formData.set("category_ids", JSON.stringify(selectedCategoryIds));

    startTransition(async () => {
      const result = await createTeam(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  const inputClass =
    "w-full rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 backdrop-blur-xl transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30";

  const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

  return (
    <section className="relative overflow-hidden pb-24 pt-6 sm:pb-28 lg:pb-36">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          <div>
            <Reveal>
              <form
                onSubmit={handleSubmit}
                className="overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface p-6 shadow-card backdrop-blur-xl sm:p-8"
              >
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)]" />

                <div className="relative space-y-7">
                  {error ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <div>
                    <label htmlFor="team-name" className={labelClass}>
                      Team Name <span className="text-accent-400">*</span>
                    </label>
                    <input
                      id="team-name"
                      type="text"
                      placeholder="Enter your team name"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="team-slug" className={labelClass}>
                      Slug <span className="text-accent-400">*</span>
                    </label>
                    <input
                      id="team-slug"
                      type="text"
                      placeholder="your-team-slug"
                      value={slug}
                      onChange={(e) => {
                        setSlugEdited(true);
                        setSlug(slugify(e.target.value));
                      }}
                      required
                      maxLength={80}
                      pattern="[a-z0-9-]+"
                      title="Lowercase letters, numbers, and hyphens only"
                      className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-ink-500">
                      Auto-generated from the name. You can edit it.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Team Logo</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface px-5 py-8 text-ink-500 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.03] hover:text-ink-300"
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
                          className="h-12 w-12 rounded-xl border border-border-strong/[0.08] object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview(null);
                            setLogoFile(null);
                          }}
                          className="text-sm text-ink-500 transition-colors hover:text-accent-400"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <fieldset>
                    <legend className={labelClass}>
                      Visibility <span className="text-accent-400">*</span>
                    </legend>
                    <div className="mt-2 flex gap-4">
                      {(["public", "private"] as const).map((opt) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3 text-sm text-ink-300 transition-all duration-300 has-[:checked]:border-accent-400/40 has-[:checked]:bg-accent/[0.04] has-[:checked]:text-ink-50"
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={opt}
                            checked={visibility === opt}
                            onChange={(e) =>
                              setVisibility(e.target.value as "public" | "private")
                            }
                            className="h-4 w-4 accent-accent-400"
                          />
                          {opt === "public" ? "Public" : "Private"}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      {visibility === "public"
                        ? "Anyone can find and view this team."
                        : "Only members can see this team."}
                    </p>
                  </fieldset>

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
                                : "border border-border-strong/[0.08] text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="team-description" className={labelClass}>
                      Description
                    </label>
                    <textarea
                      id="team-description"
                      rows={4}
                      maxLength={500}
                      placeholder="Tell people what your team is about..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`${inputClass} resize-none`}
                    />
                    <p className="mt-1.5 text-xs text-ink-500">
                      {description.length}/500 characters
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
                      {isPending ? "Creating..." : "Create Team"}
                    </Button>
                  </div>
                </div>
              </form>
            </Reveal>
          </div>

          <div className="lg:pt-8">
            <div className="lg:sticky lg:top-32">
              <Reveal delay={120}>
                <p className="mb-5 text-xs font-medium uppercase tracking-[0.15em] text-ink-500">
                  Preview
                </p>
                <TeamPreviewCard
                  name={name}
                  description={description}
                  logoPreview={logoPreview}
                />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
