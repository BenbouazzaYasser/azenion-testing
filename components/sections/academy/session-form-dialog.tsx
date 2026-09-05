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
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { useTranslation } from "@/components/translation/translation-provider";
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
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

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

function validateTimeField(time: string, t: (k: "academy.timeErrorRequired" | "academy.timeErrorFormat") => string): string | null {
  const value = time.trim();
  if (!value) return t("academy.timeErrorRequired");
  if (!TIME_24H_RE.test(value)) return t("academy.timeErrorFormat");
  return null;
}

function validateEndTimeFields(
  date: string,
  time: string,
  t: (k: "academy.endDateRequired" | "academy.endTimeRequired" | "academy.timeErrorFormat") => string
): string | null {
  const value = time.trim();
  if (!date && !value) return null;
  if (!date) return t("academy.endDateRequired");
  if (!value) return t("academy.endTimeRequired");
  if (!TIME_24H_RE.test(value)) return t("academy.timeErrorFormat");
  return null;
}

export function SessionFormDialog({ mode, session, hostOptions }: SessionFormDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);
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

  const [prevSession, setPrevSession] = useState(session);
  if (prevSession !== session) {
    setPrevSession(session);
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
  }

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
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
      setError(t("academy.hostRequired"));
      return;
    }

    const startTimeError = validateTimeField(startsTime, t);
    if (startTimeError) {
      setStartsTimeError(startTimeError);
      return;
    }
    const endTimeError = validateEndTimeFields(endsDate, endsTime, t);
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
      toast.success(mode === "edit" ? t("academy.sessionUpdated") : t("academy.sessionCreated"));
      router.refresh();
    });
  }

  return (
    <>
      {mode === "create" ? (
        <Button variant="primary" size="default" onClick={() => setOpen(true)}>
          <Plus size={15} />
          {t("academy.createSession")}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("academy.editSession")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:border-accent-400/50 hover:text-accent-400"
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
              aria-label={mode === "create" ? t("academy.createSession") : t("academy.editSession")}
            >
              <button
                type="button"
                aria-label={t("common.close")}
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={() => setOpen(false)}
              />

              <div
                ref={dialogFocusRef}
                tabIndex={-1}
                className="relative z-10 flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">
                      {mode === "create" ? t("academy.createSession") : t("academy.editSession")}
                    </h2>
                    <p className="mt-1 text-sm text-ink-400">
                      {mode === "create"
                        ? t("academy.createSessionSub")
                        : t("academy.editSessionSub")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("common.close")}
                    className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
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
                        {t("academy.sessionTitle")}
                      </label>
                      <input
                        id="session-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={200}
                        placeholder={t("academy.sessionTitlePlaceholder")}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="session-description" className={labelClass}>
                        {t("common.description")}
                      </label>
                      <textarea
                        id="session-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        maxLength={5000}
                        rows={3}
                        placeholder={t("academy.sessionDescPlaceholder")}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">
                        {description.length}/5000
                      </p>
                    </div>

                    <fieldset>
                      <legend className={labelClass}>{t("academy.hostType")}</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            { value: "BRANCH", labelKey: "academy.branch", icon: Building2 },
                            { value: "TEAM", labelKey: "academy.team", icon: Users },
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
                                    : "border-border-strong bg-surface text-ink-400"
                                )}
                              >
                                <Icon size={15} />
                              </span>
                              <span className="text-sm font-medium text-ink-50">
                                {t(option.labelKey)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="session-host" className={labelClass}>
                        {hostType === "BRANCH" ? t("academy.hostBranch") : t("academy.hostTeam")}
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
                              ? hostType === "BRANCH"
                                ? t("academy.selectBranch")
                                : t("academy.selectTeam")
                              : hostType === "BRANCH"
                                ? t("academy.noBranches")
                                : t("academy.noTeams")}
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
                          {t("academy.instructor")}
                        </label>
                        <input
                          id="session-instructor"
                          value={instructor}
                          onChange={(e) => setInstructor(e.target.value)}
                          required
                          maxLength={200}
                          placeholder={t("academy.instructorPlaceholder")}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="session-capacity" className={labelClass}>
                          {t("academy.capacity")}{" "}
                          <span className="text-ink-600">({t("common.optional")})</span>
                        </label>
                        <input
                          id="session-capacity"
                          type="number"
                          min={1}
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          placeholder={t("academy.capacityPlaceholder")}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="session-starts-date" className={labelClass}>
                          {t("academy.startsAt")}
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
                            {t("academy.timeFormatHint")}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="session-ends-date" className={labelClass}>
                          {t("academy.endTime")} <span className="text-ink-600">({t("common.optional")})</span>
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
                            {t("academy.endTimeFormatHint")}
                          </p>
                        )}
                      </div>
                    </div>

                    <fieldset>
                      <legend className={labelClass}>{t("academy.format")}</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            { value: "ONLINE", labelKey: "academy.formatOnline", icon: Video },
                            { value: "IN_PERSON", labelKey: "academy.formatInPerson", icon: MapPin },
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
                                    : "border-border-strong bg-surface text-ink-400"
                                )}
                              >
                                <Icon size={15} />
                              </span>
                              <span className="text-sm font-medium text-ink-50">
                                {t(option.labelKey)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {format === "IN_PERSON" ? (
                      <div>
                        <label htmlFor="session-location" className={labelClass}>
                          {t("academy.location")}
                        </label>
                        <input
                          id="session-location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          maxLength={500}
                          placeholder={t("academy.locationPlaceholder")}
                          className={inputClass}
                        />
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="session-meeting-url" className={labelClass}>
                          {t("academy.meetingLink")}{" "}
                          <span className="text-ink-600">({t("common.optional")})</span>
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
                        {t("academy.topics")} <span className="text-ink-600">{t("academy.topicsHint")}</span>
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
                        {t("academy.topicsChipHint")}
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
                        {t("common.cancel")}
                      </Button>
                      <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                        {isPending
                          ? t("academy.saving")
                          : mode === "create"
                            ? t("academy.createSession")
                            : t("academy.saveChanges")}
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
