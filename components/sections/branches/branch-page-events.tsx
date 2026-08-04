"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Link2,
  Users,
  Globe,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import {
  createBranchEvent,
  updateBranchEvent,
  deleteBranchEvent,
} from "@/actions/branch.actions";
import { formatShortDate, formatTime } from "@/lib/date";

interface BranchEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cover_url: string | null;
  registration_url: string | null;
  visibility: string;
  schedule: string | null;
}

interface BranchPageEventsProps {
  events: BranchEvent[];
  branchId: string;
  branchSlug: string;
  branchName: string;
  branchLogoUrl: string | null;
  canManage: boolean;
}

type EventStatus = "upcoming" | "live" | "completed";

function getEventStatus(event: { starts_at: string | null; ends_at: string | null }, now = Date.now()): EventStatus {
  if (!event.starts_at) return "upcoming";
  const start = new Date(event.starts_at).getTime();
  if (now < start) return "upcoming";
  if (event.ends_at && now >= new Date(event.ends_at).getTime()) return "completed";
  return "live";
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(109,109,255,0.15)]";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

function toScheduleFallback(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatShortDate(d.toISOString())} • ${formatTime(d.toISOString())}`;
}

export function BranchPageEvents({ events, branchId, branchSlug, branchName, branchLogoUrl, canManage }: BranchPageEventsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formRegistrationUrl, setFormRegistrationUrl] = useState("");
  const [formVisibility, setFormVisibility] = useState("public");

  function resetForm() {
    setFormTitle("");
    setFormSchedule("");
    setFormDescription("");
    setFormLocation("");
    setFormRegistrationUrl("");
    setFormVisibility("public");
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(event: BranchEvent) {
    setFormTitle(event.title);
    setFormSchedule(event.schedule ?? toScheduleFallback(event.starts_at));
    setFormDescription(event.description ?? "");
    setFormLocation(event.location ?? "");
    setFormRegistrationUrl(event.registration_url ?? "");
    setFormVisibility(event.visibility);
    setEditingId(event.id);
    setShowForm(true);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("branch_id", branchId);
    fd.set("slug", branchSlug);
    fd.set("title", formTitle);
    fd.set("schedule", formSchedule);
    fd.set("description", formDescription);
    fd.set("location", formLocation);
    fd.set("registration_url", formRegistrationUrl);
    fd.set("visibility", formVisibility);

    if (editingId) fd.set("id", editingId);

    startTransition(async () => {
      try {
        const result = editingId
          ? await updateBranchEvent(fd)
          : await createBranchEvent(fd);
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        resetForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    });
  }

  function handleDelete(eventId: string) {
    const fd = new FormData();
    fd.set("id", eventId);
    fd.set("slug", branchSlug);
    startTransition(async () => {
      await deleteBranchEvent(fd);
      router.refresh();
    });
  }

  const dated = events.filter((e) => e.starts_at);
  const undated = events.filter((e) => !e.starts_at);
  const active = dated
    .filter((e) => getEventStatus(e) !== "completed")
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());
  const history = dated
    .filter((e) => getEventStatus(e) === "completed")
    .sort((a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime());
  const upcoming = [...active, ...undated];

  function EventSchedule({ event }: { event: BranchEvent }) {
    if (event.schedule) {
      return (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-accent-400" />
            {event.schedule}
          </span>
        </div>
      );
    }

    if (event.starts_at) {
      const end = event.ends_at ? ` – ${formatTime(event.ends_at)}` : "";
      return (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-accent-400" />
            {formatShortDate(event.starts_at)} • {formatTime(event.starts_at)}
            {end}
          </span>
        </div>
      );
    }

    return null;
  }

  function renderEvent(event: BranchEvent, i: number) {
    const status = getEventStatus(event);

    return (
      <Reveal key={event.id} delay={i * 60} className="h-full">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm sm:flex-row">
          {event.cover_url ? (
            <div className="relative h-40 w-full shrink-0 sm:h-auto sm:w-44">
              <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-40 w-full shrink-0 items-center justify-center bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.12),transparent_70%)] sm:h-auto sm:w-44">
              <Calendar className="h-8 w-8 text-accent-400/60" />
            </div>
          )}

          <div className="relative flex flex-1 flex-col p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-400">
                    {branchLogoUrl ? (
                      <img src={branchLogoUrl} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                    ) : (
                      <Calendar size={10} className="text-ink-500" />
                    )}
                    {branchName}
                  </span>
                  {status === "upcoming" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-accent-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                      Upcoming
                    </span>
                  ) : status === "live" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ink-700/50 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                      Completed
                    </span>
                  )}
                  {event.visibility === "public" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-400">
                      <Globe size={10} />
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-400">
                      <Users size={10} />
                      Members
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-[1.05rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                  {event.title}
                </h3>
              </div>

              {canManage ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(event)}
                    aria-label="Edit event"
                    className="rounded-lg border border-border-strong bg-white/[0.03] p-2 text-ink-400 transition-colors hover:bg-white/[0.06] hover:text-accent-400"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id)}
                    aria-label="Delete event"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : null}
            </div>

            {event.description ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-400">{event.description}</p>
            ) : null}

            <div className="mt-4">
              <EventSchedule event={event} />
            </div>

            {event.location ? (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-ink-400">
                <MapPin size={13} className="text-accent-400" />
                {event.location}
              </div>
            ) : null}

            <div className="flex-1" />

            {event.registration_url ? (
              <a
                href={event.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-400 transition-colors hover:text-accent-300"
              >
                <Link2 size={13} />
                Register
              </a>
            ) : null}
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="branch-events-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              <Calendar size={12} />
              Events
            </div>
            {canManage ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus size={14} />
                Add Event
              </Button>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="branch-events-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Branch events
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-400">
            Upcoming events come first, past events below.
          </p>
        </Reveal>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {showForm ? (
          <Reveal delay={120}>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-card sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-50">
                  {editingId ? "Edit Event" : "New Event"}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-white/5 hover:text-ink-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="event-title" className={labelClass}>
                    Title <span className="text-accent-400">*</span>
                  </label>
                  <input
                    id="event-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="e.g. Intro to Web Development Workshop"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="event-schedule" className={labelClass}>
                    Schedule <span className="text-accent-400">*</span>
                  </label>
                  <input
                    id="event-schedule"
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                    required
                    maxLength={300}
                    placeholder='e.g. "Saturday, August 12 / 14:00 - 17:30" or "12 Aug 2026 / 2 PM - 5 PM"'
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-ink-500">
                    Free-text date and time — anything that reads naturally.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="event-location" className={labelClass}>
                      Location
                    </label>
                    <input
                      id="event-location"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. EMSI Rabat, Room B203"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="event-registration" className={labelClass}>
                      Registration URL
                    </label>
                    <input
                      id="event-registration"
                      value={formRegistrationUrl}
                      onChange={(e) => setFormRegistrationUrl(e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="event-description" className={labelClass}>
                    Description
                  </label>
                  <textarea
                    id="event-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Visibility</label>
                  <div className="mt-2 flex gap-4">
                    {(["public", "members"] as const).map((opt) => (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-white/[0.02] px-4 py-3 text-sm text-ink-300 transition-all duration-300 has-[:checked]:border-accent-400/40 has-[:checked]:bg-accent/[0.04] has-[:checked]:text-ink-50"
                      >
                        <input
                          type="radio"
                          value={opt}
                          checked={formVisibility === opt}
                          onChange={(e) => setFormVisibility(e.target.value)}
                          className="h-4 w-4 accent-accent-400"
                        />
                        {opt === "public" ? "Public" : "Members only"}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-border pt-5">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={
                      isPending ||
                      !formTitle.trim() ||
                      !formSchedule.trim()
                    }
                  >
                    {isPending ? "Saving..." : editingId ? "Save Changes" : "Add Event"}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={resetForm} disabled={isPending}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Reveal>
        ) : null}

        {events.length > 0 ? (
          <div className="mt-10 space-y-6">
            {upcoming.length > 0 ? (
              <>
                <Reveal delay={120}>
                  <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-ink-500">
                    Upcoming
                  </h3>
                </Reveal>
                {upcoming.map((event, i) => renderEvent(event, i))}
              </>
            ) : null}

            {history.length > 0 ? (
              <>
                <Reveal delay={120}>
                  <h3 className="pt-6 text-sm font-medium uppercase tracking-[0.15em] text-ink-500">
                    Past Events
                  </h3>
                </Reveal>
                {history.map((event, i) => renderEvent(event, i))}
              </>
            ) : null}
          </div>
        ) : (
          <Reveal delay={120}>
            <div className="mt-10 flex flex-col items-center gap-3 py-14 text-center">
              <Calendar className="h-7 w-7 text-ink-600" />
              <p className="text-sm text-ink-500">
                {canManage
                  ? "No events yet. Add the branch's first event."
                  : "No events have been scheduled yet."}
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
