"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Server } from "lucide-react";
import { createUserServer } from "@/actions/server.actions";
import { Button } from "@/components/ui/button";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CreateServerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Server name must be at least 2 characters.");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("slug", (slugTouched ? slug : slugify(name)).trim());
    fd.set("description", description.trim());

    const result = await createUserServer(fd);
    // On success the action redirects; if we're here it returned an error.
    if (result && "error" in result && result.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-surface px-4 py-3 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input border-0";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="server-name" className="mb-1.5 block text-sm font-medium text-ink-200">
          Server name
        </label>
        <input
          id="server-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          maxLength={60}
          required
          placeholder="Design Club"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="server-slug" className="mb-1.5 block text-sm font-medium text-ink-200">
          Slug
        </label>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-sm text-ink-600">/servers/</span>
          <input
            id="server-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            onBlur={() => setSlug(slugify(slug))}
            maxLength={60}
            required
            placeholder="design-club"
            className={`${inputClass} font-mono text-sm`}
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-500">Lowercase letters, numbers and dashes.</p>
      </div>

      <div>
        <label htmlFor="server-description" className="mb-1.5 block text-sm font-medium text-ink-200">
          Description <span className="text-ink-600">(optional)</span>
        </label>
        <textarea
          id="server-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="What is this server about?"
          className={`${inputClass} resize-none`}
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={() => router.push("/servers")}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Server size={16} />
          )}
          Create server
        </Button>
      </div>

      <p className="pt-1 text-center text-xs leading-relaxed text-ink-500">
        A <strong className="font-medium text-ink-400">#general</strong> channel is created
        automatically — add more channels any time.
      </p>
    </form>
  );
}
