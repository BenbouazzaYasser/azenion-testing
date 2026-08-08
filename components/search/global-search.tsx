"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import {
  Search,
  X,
  Users,
  Building2,
  Rocket,
  ArrowRight,
  Megaphone,
  Newspaper,
  Video,
} from "lucide-react";
import { globalSearch, type GlobalSearchResponse, type SearchCategory } from "@/actions/search.actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CATEGORY_HEADERS: { value: SearchCategory; label: string; icon: typeof Users }[] = [
  { value: "Users", label: "Users", icon: Users },
  { value: "Teams", label: "Teams", icon: Building2 },
  { value: "Projects", label: "Projects", icon: Rocket },
  { value: "Branches", label: "Branches", icon: Building2 },
  { value: "Feed posts", label: "Feed posts", icon: Newspaper },
  { value: "Academy sessions", label: "Academy sessions", icon: Video },
  { value: "Announcements", label: "Announcements", icon: Megaphone },
];

interface GlobalSearchProps {
  variant?: "desktop" | "mobile";
}

export function GlobalSearch({ variant = "desktop" }: GlobalSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: userLoading } = useUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const closePalette = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // Flat list of selectable items for keyboard navigation (stable index).
  const flatItems = useMemo(
    () => (data?.results ?? []).map((item, index) => ({ ...item, _i: index })),
    [data],
  );

  const grouped = useMemo(() => {
    if (!flatItems.length) return [];
    return CATEGORY_HEADERS.map(({ value, label, icon }) => {
      const items = flatItems.filter((r) => r.category === value);
      return items.length ? { label, icon, items } : null;
    }).filter(Boolean) as { label: string; icon: typeof Users; items: (typeof flatItems)[number][] }[];
  }, [flatItems]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        closePalette();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closePalette();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePalette]);

  // Global Ctrl/Cmd+K to open from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset scroll + active index to top of the active item after nav.
  useEffect(() => {
    const el = panelRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const run = useCallback(async (term: string) => {
    requestIdRef.current += 1;
    const myId = requestIdRef.current;
    setLoading(true);
    const res = await globalSearch(term);
    if (requestIdRef.current !== myId) return; // stale response
    setData(res);
    setLoading(false);
  }, []);

  const debouncedRun = useCallback(
    (term: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => run(term), 300);
    },
    [run],
  );

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
    if (!value.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestIdRef.current += 1;
      setData(null);
      setLoading(false);
      return;
    }
    debouncedRun(value.trim());
  }

  function openPalette() {
    setOpen(true);
    setActiveIndex(0);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  }

  function handleSelect(href: string) {
    setOpen(false);
    // If navigating to chat/start and user is not authenticated, redirect to login with next param
    if (href.startsWith("/chat/start/") && !user) {
      const next = encodeURIComponent(href);
      router.push(`/login?next=${encodeURIComponent(href)}`);
      return;
    }
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!flatItems.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) handleSelect(item.href);
    }
  }

  // Simple focus trap for the modal.
  function handlePanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'input, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {variant === "desktop" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={openPalette}
          aria-label="Search Azenion (Ctrl+K)"
          className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] text-ink-400 transition-all duration-300 ease-premium hover:scale-105 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-[0_0_20px_-5px_rgba(109,109,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
        >
          <Search size={18} aria-hidden />
          <span
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/[0.1] bg-[rgba(9,10,15,0.9)] px-2.5 py-1.5 text-xs font-medium text-ink-200 opacity-0 shadow-dropdown backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            Search
            <span className="ml-1.5 rounded border border-white/[0.1] bg-white/[0.04] px-1 py-0.5 text-[10px] font-medium text-ink-400">
              ⌘K
            </span>
          </span>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={openPalette}
          aria-label="Search"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-50 transition-transform duration-300 hover:scale-105 hover:bg-white/[0.06] hover:border-accent-400/40 hover:shadow-[0_0_18px_-6px_rgba(109,109,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      )}

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] px-4 sm:px-6 pt-16 sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search Azenion">
              <button
                type="button"
                aria-label="Close search"
                className={cn(
                  "absolute inset-0 cursor-default border-0 bg-void-950/80 backdrop-blur-md transition-opacity duration-200",
                )}
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={closePalette}
              />

              <div
                ref={panelRef}
                onKeyDown={handlePanelKeyDown}
                className={cn(
                  "relative z-10 mx-auto flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[rgba(10,11,16,0.9)] shadow-dialog backdrop-blur-2xl backdrop-saturate-150 transition-all duration-200 ease-premium",
                )}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(-8px)",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/80 to-transparent"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-20 right-8 h-40 w-40 rounded-full bg-accent/30 blur-[80px]"
                />

                <div className="relative flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
                  <div className="text-ink-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search users, teams, projects, branches…"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-50 placeholder:text-ink-600 outline-none"
                    aria-label="Search Azenion"
                  />
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin text-accent-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                    </svg>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={closePalette} aria-label="Close">
                      <X size={17} />
                    </Button>
                  )}
                </div>

                <div className="max-h-[calc(80vh-72px)] min-h-0 overflow-y-auto overscroll-contain px-2 py-2">
                  {query && !loading && data && data.results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-ink-500">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-6 w-6">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-ink-200">No results found.</p>
                      <p className="mt-1 text-xs text-ink-500">Try different keywords or explore the network instead.</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {SUGGESTED_LINKS.map((s) => (
                          <button
                            key={s.href}
                            type="button"
                            onClick={() => handleSelect(s.href)}
                            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:border-accent-400/40 hover:bg-accent/[0.08] hover:text-accent-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {loading && query ? (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="h-9 w-9 animate-pulse rounded-xl bg-white/[0.05]" />
                      <div className="space-y-2">
                        <div className="h-3 w-40 animate-pulse rounded bg-white/[0.07]" />
                        <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.05]" />
                      </div>
                    </div>
                  ) : null}

                  {!loading && grouped.map((group) => (
                    <div key={group.label} className="mb-1">
                      <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5">
                        <group.icon size={13} className="text-accent-300" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                          {group.label}
                        </span>
                      </div>
                      {group.items.map((item) => {
                        const active = item._i === activeIndex;
                        return (
                          <button
                            key={`${item.category}-${item.id}-${item._i}`}
                            type="button"
                            onMouseEnter={() => setActiveIndex(item._i)}
                            onClick={() => handleSelect(item.href)}
                            className={cn(
                              "group w-full rounded-xl px-3 py-2.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                              active ? "bg-white/[0.06] ring-1 ring-accent-400/30 shadow-[0_0_18px_-8px_rgba(90,120,255,0.5)]" : "hover:bg-white/[0.04]",
                            )}
                          >
                            <span className="flex items-center gap-3">
                              <span className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-xs font-semibold",
                                active
                                  ? "border-accent-400/40 bg-accent/[0.12] text-accent-200"
                                  : "border-white/[0.08] bg-white/[0.04] text-ink-300",
                              )}>
                                {item.image ? (
                                  item.image.startsWith("http") ? (
                                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-base leading-none">{item.image}</span>
                                  )
                                ) : (
                                  <group.icon size={16} />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-medium text-ink-100">
                                  {item.title}
                                </span>
                                {item.subtitle ? (
                                  <span className="block truncate text-xs text-ink-500">{item.subtitle}</span>
                                ) : null}
                              </span>
                              {item.meta ? (
                                <span className="hidden shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-ink-500 sm:block">
                                  {item.meta}
                                </span>
                              ) : null}
                              <span className={cn("shrink-0 text-ink-500 transition-opacity", active ? "opacity-100" : "opacity-0")}>
                                <ArrowRight size={15} />
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {!query && (
                    <div className="px-4 py-10 text-center">
                      <p className="text-sm font-medium text-ink-200">Search the whole network</p>
                      <p className="mt-1 text-xs text-ink-500">Press <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px]">esc</kbd> to close</p>
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const SUGGESTED_LINKS = [
  { label: "Explore teams", href: "/teams" },
  { label: "Discover projects", href: "/projects" },
  { label: "Visit branches", href: "/branches" },
];