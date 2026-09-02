"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Search as SearchIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GifResult } from "@/lib/gif/provider";

interface GifPickerProps {
  onSelect: (gif: GifResult) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attribution, setAttribution] = useState<string | null>(null);

  const fetchGifs = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/chat/gif/search", window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      url.searchParams.set("limit", "12");
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load GIFs");
      setResults(json.results ?? []);
      setAttribution(json.attribution ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load GIFs";
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search / initial trending
  useEffect(() => {
    const t = setTimeout(() => {
      void fetchGifs(query);
    }, query ? 400 : 0);
    return () => clearTimeout(t);
  }, [query, fetchGifs]);

  // Close on Escape is handled by parent container's outside click handler; keep local Esc too
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label="GIF picker"
      className="flex max-h-[380px] w-[320px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-glass-strong shadow-dropdown backdrop-blur-2xl sm:w-[360px]"
    >
      <div className="shrink-0 border-b border-border/50 p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            aria-label="Search GIFs"
            className="w-full rounded-full bg-surface py-2 pl-9 pr-3 text-sm text-ink-50 placeholder:text-ink-500 outline-none focus:ring-2 focus:ring-accent-400/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-ink-500">{error}</p>
            {error.includes("GIPHY_API_KEY") && (
              <p className="max-w-[260px] text-xs text-ink-400">
                Set <code className="rounded bg-surface px-1">GIPHY_API_KEY</code> on the server to enable GIF search.
              </p>
            )}
          </div>
        )}
        {!loading && !error && results.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-500">{query ? "No GIFs found" : "No trending GIFs"}</p>
        )}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelect(gif)}
                className="group relative overflow-hidden rounded-xl bg-surface ring-1 ring-border hover:ring-accent-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                aria-label={gif.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  loading="lazy"
                  className="h-28 w-full object-cover transition-opacity group-hover:opacity-90"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {attribution && (
        <div className="shrink-0 border-t border-border/30 px-3 py-1.5 text-center text-[10px] uppercase tracking-widest text-ink-500">
          {attribution}
        </div>
      )}
    </div>
  );
}
