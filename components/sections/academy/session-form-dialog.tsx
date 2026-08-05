"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  MapPin,
  Pencil,
  Plus,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLiveSession, updateLiveSession } from "@/actions/live-session.actions";
import {
  LIVE_SESSION_FORMATS,
  type LiveSessionFormat,
  type LiveSessionHostType,
  type LiveSessionWithManage,
  type ManageableHostOption,
} from "@/lib/validations/live-session.schema";
import { cn } from "@/lib/utils";

interface SessionFormDialogProps {
  mode: "create" | "edit";
  session?: LiveSessionWithManage;
  hostOptions: ManageableHostOption[];
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

function isoToLocalParts(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

const TIME_24H_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateTimeField(time: string): string | null {
  const value = time.trim();
  if (!value) return "Time is required";
  if (!TIME_24H_RE.test(value)) return "Use 24-hour HH:MM, e.g. 18:30";
  return null;
}

function validateEndTimeFields(date: string, time: string): string | null {
  const value = time.trim();
  if (!date && !value) return null;
  if (!date) return "End date is required when an end time is provided";
  if (!value) return "End time is required when an end date is provided";
  if (!TIME_24H_RE.test(value)) return "Use 24-hour HH:MM, e.g. 18:30";
  return null;
}

export function SessionFormDialog({ mode, session, hostOptions }: SessionFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostType, setHostType] = useState<LiveSessionHostType>("BRANCH");
  const [hostId, setHostId] = useState("");
  const [instructor, setInstructor] = useState("");
  const [startsDate, setStartsDate] = useState("");
  const [startsTime, setStartsTime] = useState("");
  const [endsDate, setEndsDate] = useState("");
  const [endsTime, setEndsTime] = useState("");
  const [startsTimeError, setStartsTimeError] = useState<string | null>(null);
  const [endsTimeError, setEndsTimeError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [format, setFormat] = useState<LiveSessionFormat>("ONLINE");
  const [capacity, setCapacity] = useState("");
  const [topics, setTopics] = useState("");

  useEffect(() => {
    setTitle(session?.title ?? "");
    setDescription(session?.description ?? "");
    setHostType(session?.host_type ?? "BRANCH");
    setHostId(session?.host_id ?? "");
    setInstructor(session?.instructor ?? "");
    if (session) {
      const start = isoToLocalParts(session.starts_at);
      setStartsDate(start.date);
      setStartsTime(start.time);
      if (session.ends_at) {
        const end = isoToLocalParts(session.ends_at);
        setEndsDate(end.date);
        setEndsTime(end.time);
      } else {
        setEndsDate("");
        setEndsTime("");
      }
    } else {
      setStartsDate("");
      setStartsTime("");
      setEndsDate("");
      setEndsTime("");
    }
    setLocation(session?.location ?? "");
    setMeetingUrl(session?.meeting_url ?? "");
    setFormat(session?.format ?? "ONLINE");
    setCapacity(session?.capacity ? String(session.capacity) : "");
    setTopics(session?.topics?.join("\n") ?? "");
  }, [session]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  const filteredHosts = useMemo(() => {
    const matching = hostOptions.filter((host) => host.host_type === hostType);
    if (
      mode === "edit" &&
      session &&
      session.host_type === hostType &&
      !matching.some((host) => host.host_id === session.host_id)
    ) {
      return [
        {
          host_type: session.host_type,
          host_id: session.host_id,
          host_name: session.host_name,
        },
        ...matching,
      ];
    }
    return matching;
  }, [hostOptions, hostType, mode, session]);

  function resetForm() {
    setTitle(session?.title ?? "");
    setDescription(session?.description ?? "");
    setHostType(session?.host_type ?? "BRANCH");
    setHostId(session?.host_id ?? "");
    setInstructor(session?.instructor ?? "");
    if (session) {
      const start = isoToLocalParts(session.starts_at);
      setStartsDate(start.date);
      setStartsTime(start.time);
      if (session.ends_at) {
        const end = isoToLocalParts(session.ends_at);
        setEndsDate(end.date);
        setEndsTime(end.time);
      } else {
        setEndsDate("");
        setEndsTime("");
      }
    } else {
      setStartsDate("");
      setStartsTime("");
      setEndsDate("");
      setEndsTime("");
    }
    setLocation(session?.location ?? "");
    setMeetingUrl(session?.meeting_url ?? "");
    setFormat(session?.format ?? "ONLINE");
    setCapacity(session?.capacity ? String(session.capacity) : "");
    setTopics(session?.topics?.join("\n") ?? "");
    setStartsTimeError(null);
    setEndsTimeError(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStartsTimeError(null);
    setEndsTimeError(null);

    if (!hostId) {
      setError("Please choose a host");
      return;
    }

    const startTimeError = validateTimeField(startsTime);
    if (startTimeError) {
      setStartsTimeError(startTimeError);
      return;
    }
    const endTimeError = validateEndTimeFields(endsDate, endsTime);
    if (endTimeError) {
      setEndsTimeError(endTimeError);
      return;
    }

    const startsAt = `${startsDate}T${startsTime.trim()}`;
    const hasEnd = Boolean(endsDate && endsTime.trim());
    const endsAt = hasEnd ? `${endsDate}T${endsTime.trim()}` : "";

    startTransition(async () => {
      const fd = new FormData();
      if (mode === "edit" && session) fd.set("id", session.id);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("host_type", hostType);
      fd.set("host_id", hostId);
      fd.set("instructor", instructor);
      fd.set("starts_at", startsAt);
      fd.set("ends_at", endsAt);
      fd.set("location", location);
      fd.set("meeting_url", meetingUrl);
      fd.set("format", format);
      fd.set("capacity", capacity);
      fd.set("topics", topics);

      const result =
        mode === "edit" ? await updateLiveSession(fd) : await createLiveSession(fd);

      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      resetForm();
      toast.success(mode === "edit" ? "Session updated." : "Session created.");
      router.refresh();
    });
  }

  return (
    <>
      {mode === "create" ? (
        <Button variant="primary" size="default" onClick={() => setOpen(true)}>
          <Plus size={15} />
          Create Session
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Edit session"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-ink-400 transition-colors hover:border-accent-400/50 hover:text-accent-400"
        >
          <Pencil size={13} />
        </button>
      )}

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label={mode === "create" ? "Create session" : "Edit session"}
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={() => setOpen(false)}
              />

              <div
                className="relative z-10 flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(20,20,28,0.98),rgba(8,8,12,0.98))] shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">
                      {mode === "create" ? "Create Session" : "Edit Session"}
                    </h2>
                    <p className="mt-1 text-sm text-ink-400">
                      {mode === "create"
                        ? "Schedule a new live session for the Academy."
                        : "Update this live session."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-white/[0.06] hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="session-title" className={labelClass}>
                        Session title
                      </label>
                      <input
                        id="session-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={200}
                        placeholder="e.g. Intro to Web Development"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="session-description" className={labelClass}>
                        Description
                      </label>
                      <textarea
                        id="session-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        maxLength={5000}
                        rows={3}
                        placeholder="What will this session cover?"
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">
                        {description.length}/5000
                      </p>
                    </div>

                    <fieldset>
                      <legend className={labelClass}>Host type</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            { value: "BRANCH", label: "Branch", icon: Building2 },
                            { value: "TEAM", label: "Team", icon: Users },
                          ] as const
                        ).map((option) => {
                          const Icon = option.icon;
                          const selected = hostType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                setHostType(option.value);
                                setHostId("");
                              }}
                              className={cn(
                                "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ease-premium cursor-pointer",
                                selected
                                  ? "border-accent-400/60 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(109,109,255,0.2)]"
                                  : "border-border-strong text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                  selected
                                    ? "border-accent-400/50 bg-accent/10 text-accent-300"
                                    : "border-border-strong bg-white/[0.02] text-ink-400"
                                )}
                              >
                                <Icon size={15} />
                              </span>
                              <span className="text-sm font-medium text-ink-50">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="session-host" className={labelClass}>
                        Host {hostType === "BRANCH" ? "branch" : "team"}
                      </label>
                      <div className="relative">
                        <select
                          id="session-host"
                          value={hostId}
                          onChange={(e) => setHostId(e.target.value)}
                          required
                          className={cn(inputClass, "cursor-pointer appearance-none pr-10")}
                        >
                          <option value="">
                            {filteredHosts.length > 0
                              ? `Select a ${hostType === "BRANCH" ? "branch" : "team"}`
                              : `No ${hostType === "BRANCH" ? "branches" : "teams"} available`}
                          </option>
                          {filteredHosts.map((host) => (
                            <option key={host.host_id} value={host.host_id}>
                              {host.host_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="session-instructor" className={labelClass}>
                          Instructor
                        </label>
                        <input
                          id="session-instructor"
                          value={instructor}
                          onChange={(e) => setInstructor(e.target.value)}
                          required
                          maxLength={200}
                          placeholder="Who is teaching?"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="session-capacity" className={labelClass}>
                          Capacity{" "}
                          <span className="text-ink-600">(optional)</span>
                        </label>
                        <input
                          id="session-capacity"
                          type="number"
                          min={1}
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          placeholder="e.g. 50"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="session-starts-date" className={labelClass}>
                          Starts at
                        </label>
                        <input
                          id="session-starts-date"
                          type="date"
                          value={startsDate}
                          onChange={(e) => setStartsDate(e.target.value)}
                          required
                          className={inputClass}
                        />
                        <input
                          id="session-starts-time"
                          type="text"
                          value={startsTime}
                          onChange={(e) => setStartsTime(e.target.value)}
                          autoComplete="off"
                          maxLength={5}
                          placeholder="18:30"
                          aria-label="Start time (24-hour format)"
                          className={cn(
                            inputClass,
                            "mt-3",
                            startsTimeError &&
                              "border-red-500/50 focus:border-red-500/60 focus:shadow-input-error"
                          )}
                        />
                        {startsTimeError ? (
                          <p className="mt-1.5 text-xs text-red-300">{startsTimeError}</p>
                        ) : (
                          <p className="mt-1.5 text-xs text-ink-500">
                            24-hour format, e.g. 18:30
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="session-ends-date" className={labelClass}>
                          End Time <span className="text-ink-600">(optional)</span>
                        </label>
                        <input
                          id="session-ends-date"
                          type="date"
                          value={endsDate}
                          onChange={(e) => setEndsDate(e.target.value)}
                          className={inputClass}
                        />
                        <input
                          id="session-ends-time"
                          type="text"
                          value={endsTime}
                          onChange={(e) => setEndsTime(e.target.value)}
                          autoComplete="off"
                          maxLength={5}
                          placeholder="18:30"
                          aria-label="End time (24-hour format, optional)"
                          className={cn(
                            inputClass,
                            "mt-3",
                            endsTimeError &&
                              "border-red-500/50 focus:border-red-500/60 focus:shadow-input-error"
                          )}
                        />
                        {endsTimeError ? (
                          <p className="mt-1.5 text-xs text-red-300">{endsTimeError}</p>
                        ) : (
                          <p className="mt-1.5 text-xs text-ink-500">
                            24-hour format, e.g. 18:30. Leave empty for an open-ended session.
                          </p>
                        )}
                      </div>
                    </div>

                    <fieldset>
                      <legend className={labelClass}>Format</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            { value: "ONLINE", label: "Online", icon: Video },
                            { value: "IN_PERSON", label: "In-person", icon: MapPin },
                          ] as const
                        ).map((option) => {
                          const Icon = option.icon;
                          const selected = format === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setFormat(option.value)}
                              className={cn(
                                "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ease-premium cursor-pointer",
                                selected
                                  ? "border-accent-400/60 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(109,109,255,0.2)]"
                                  : "border-border-strong text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                  selected
                                    ? "border-accent-400/50 bg-accent/10 text-accent-300"
                                    : "border-border-strong bg-white/[0.02] text-ink-400"
                                )}
                              >
                                <Icon size={15} />
                              </span>
                              <span className="text-sm font-medium text-ink-50">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {format === "IN_PERSON" ? (
                      <div>
                        <label htmlFor="session-location" className={labelClass}>
                          Location
                        </label>
                        <input
                          id="session-location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          maxLength={500}
                          placeholder="Building, room or venue"
                          className={inputClass}
                        />
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="session-meeting-url" className={labelClass}>
                          Meeting link{" "}
                          <span className="text-ink-600">(optional)</span>
                        </label>
                        <input
                          id="session-meeting-url"
                          type="url"
                          value={meetingUrl}
                          onChange={(e) => setMeetingUrl(e.target.value)}
                          maxLength={500}
                          placeholder="https://meet.example.com/..."
                          className={inputClass}
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="session-topics" className={labelClass}>
                        Topics <span className="text-ink-600">(optional, one per line)</span>
                      </label>
                      <textarea
                        id="session-topics"
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        rows={3}
                        placeholder={"Programming\nDocker\nAlgorithms"}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">
                        Each line becomes a topic chip on the session card.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setOpen(false);
                          resetForm();
                        }}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                        {isPending
                          ? "Saving..."
                          : mode === "create"
                            ? "Create Session"
                            : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
