"use client";

import { useState, useRef } from "react";
import { ImagePlus, X, Github, Link as LinkIcon, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

const CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "Artificial Intelligence",
  "Cybersecurity",
  "Design",
  "Research",
  "Entrepreneurship",
  "Other",
] as const;

const STATUSES = ["Idea", "Planning", "Active"] as const;

const BRANCHES = ["EMSI", "FSR"] as const;

interface FormData {
  name: string;
  description: string;
  category: string;
  status: string;
  technologies: string[];
  logo: string | null;
  githubRepo: string;
  website: string;
  relatedTeam: string;
  relatedBranch: string;
  lookingFor: string;
}

function ProjectPreviewCard({ data }: { data: FormData }) {
  const tags = [data.status, data.category, ...data.technologies].filter(Boolean);
  if (data.relatedBranch) tags.push(data.relatedBranch);

  return (
    <div className="group overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium">
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08] p-3">
            {data.logo ? (
              <img src={data.logo} alt="Project logo" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <Users className="h-7 w-7 text-accent-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-white/[0.03] px-3 py-1 text-[11px] font-medium tracking-wide text-ink-200">
              {data.status || "Status"}
            </div>
          </div>
        </div>

        <h3 className="mt-5 truncate text-xl font-semibold text-white sm:text-2xl">
          {data.name || "Your Project Name"}
        </h3>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/60">
          {data.description || "Your project description will appear here."}
        </p>

        {tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] font-medium text-white/55"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {(data.githubRepo || data.website) && (
          <div className="mt-5 flex flex-wrap gap-4 border-t border-white/10 pt-4">
            {data.githubRepo && (
              <span className="flex items-center gap-1.5 text-xs text-white/45">
                <Github size={13} />
                {data.githubRepo.replace("https://github.com/", "")}
              </span>
            )}
            {data.website && (
              <span className="flex items-center gap-1.5 text-xs text-white/45">
                <LinkIcon size={13} />
                {data.website.replace(/https?:\/\//, "").split("/")[0]}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateProjectForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    category: "",
    status: "",
    technologies: [],
    logo: null,
    githubRepo: "",
    website: "",
    relatedTeam: "",
    relatedBranch: "",
    lookingFor: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [techInput, setTechInput] = useState("");
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

  function addTechnology(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || formData.technologies.includes(trimmed)) return;
    updateField("technologies", [...formData.technologies, trimmed]);
    setTechInput("");
  }

  function removeTechnology(tag: string) {
    updateField("technologies", formData.technologies.filter((t) => t !== tag));
  }

  function handleTechKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTechnology(techInput);
    }
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
                  {/* Project Name */}
                  <div>
                    <label htmlFor="project-name" className={labelBase}>
                      Project Name <span className="text-accent-400">*</span>
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      placeholder="Enter your project name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className={inputBase}
                    />
                  </div>

                  {/* Short Description */}
                  <div>
                    <label htmlFor="project-description" className={labelBase}>
                      Short Description <span className="text-accent-400">*</span>
                    </label>
                    <textarea
                      id="project-description"
                      rows={3}
                      placeholder="What does your project do?"
                      value={formData.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      className={inputBase + " resize-none"}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="project-category" className={labelBase}>
                      Category <span className="text-accent-400">*</span>
                    </label>
                    <select
                      id="project-category"
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

                  {/* Status */}
                  <div>
                    <label htmlFor="project-status" className={labelBase}>
                      Status <span className="text-accent-400">*</span>
                    </label>
                    <div className="mt-2 flex gap-3">
                      {STATUSES.map((s) => (
                        <label
                          key={s}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-white/[0.02] px-4 py-3 text-sm text-ink-300 transition-all duration-300 has-[:checked]:border-accent-400/40 has-[:checked]:bg-accent/[0.04] has-[:checked]:text-ink-50"
                        >
                          <input
                            type="radio"
                            name="status"
                            value={s}
                            checked={formData.status === s}
                            onChange={(e) => updateField("status", e.target.value)}
                            className="h-4 w-4 accent-accent-400"
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Technologies */}
                  <div>
                    <label htmlFor="project-tech" className={labelBase}>
                      Technologies <span className="text-accent-400">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent/[0.08] px-3 py-1 text-[12px] font-medium text-accent-300"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTechnology(tech)}
                            className="text-accent-400/60 transition-colors hover:text-accent-300"
                            aria-label={`Remove ${tech}`}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        id="project-tech"
                        type="text"
                        placeholder="Type a technology and press Enter"
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={handleTechKeyDown}
                        className={inputBase + " flex-1"}
                      />
                      <button
                        type="button"
                        onClick={() => addTechnology(techInput)}
                        className="rounded-xl border border-border-strong bg-white/[0.03] px-4 text-sm text-ink-400 transition-all duration-300 hover:border-accent-400/40 hover:text-accent-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Project Logo */}
                  <div>
                    <label className={labelBase}>
                      Project Logo
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
                        {logoPreview ? "Change logo" : "Upload project logo"}
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

                  {/* GitHub Repository */}
                  <div>
                    <label htmlFor="project-github" className={labelBase}>
                      GitHub Repository
                    </label>
                    <div className="relative">
                      <Github
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
                      />
                      <input
                        id="project-github"
                        type="url"
                        placeholder="https://github.com/username/repo"
                        value={formData.githubRepo}
                        onChange={(e) => updateField("githubRepo", e.target.value)}
                        className={inputBase + " pl-11"}
                      />
                    </div>
                  </div>

                  {/* Project Website */}
                  <div>
                    <label htmlFor="project-website" className={labelBase}>
                      Project Website
                    </label>
                    <div className="relative">
                      <LinkIcon
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
                      />
                      <input
                        id="project-website"
                        type="url"
                        placeholder="https://yourproject.dev"
                        value={formData.website}
                        onChange={(e) => updateField("website", e.target.value)}
                        className={inputBase + " pl-11"}
                      />
                    </div>
                  </div>

                  {/* Related Team */}
                  <div>
                    <label htmlFor="project-team" className={labelBase}>
                      Related Team
                    </label>
                    <input
                      id="project-team"
                      type="text"
                      placeholder="e.g. Azenion Core Team"
                      value={formData.relatedTeam}
                      onChange={(e) => updateField("relatedTeam", e.target.value)}
                      className={inputBase}
                    />
                  </div>

                  {/* Related Branch */}
                  <div>
                    <label htmlFor="project-branch" className={labelBase}>
                      Related Branch
                    </label>
                    <select
                      id="project-branch"
                      value={formData.relatedBranch}
                      onChange={(e) => updateField("relatedBranch", e.target.value)}
                      className={inputBase + " appearance-none"}
                    >
                      <option value="">None</option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b} className="bg-void-950">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Looking For */}
                  <div>
                    <label htmlFor="project-looking-for" className={labelBase}>
                      Looking For
                    </label>
                    <textarea
                      id="project-looking-for"
                      rows={3}
                      placeholder="Describe the collaborators you're looking for..."
                      value={formData.lookingFor}
                      onChange={(e) => updateField("lookingFor", e.target.value)}
                      className={inputBase + " resize-none"}
                    />
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <Button type="submit" size="lg" className="w-full sm:w-auto">
                      Create Project
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
                <ProjectPreviewCard data={formData} />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
