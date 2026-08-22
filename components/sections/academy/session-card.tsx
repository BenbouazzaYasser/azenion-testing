import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Timer,
  User,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate, formatTime } from "@/lib/date";
import { SessionStatusBadge } from "./session-status-badge";
import { SessionFormDialog } from "./session-form-dialog";
import { SessionJoinButton } from "./session-join-button";
import { DeleteSessionButton } from "./delete-session-button";
import type {
  LiveSessionWithManage,
  ManageableHostOption,
} from "@/lib/validations/live-session.schema";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins} min`;
}

interface SessionCardProps {
  session: LiveSessionWithManage;
  hostOptions: ManageableHostOption[];
}

export function SessionCard({ session, hostOptions }: SessionCardProps) {
  const isEnded = session.status === "ENDED";
  const isLive = session.status === "LIVE";
  const isFull = session.capacity != null && session.attendee_count >= session.capacity;

  const dateLabel = formatShortDate(session.starts_at);
  const hasEnd = Boolean(session.ends_at);
  const timeLabel = hasEnd
    ? `${formatTime(session.starts_at)} – ${formatTime(session.ends_at!)}`
    : formatTime(session.starts_at);
  const durationLabel = hasEnd ? formatDuration(session.duration_minutes ?? 0) : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <SessionStatusBadge status={session.status} />
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              session.format === "ONLINE"
                ? "border-border-strong bg-surface text-ink-300"
                : "border-accent/25 bg-accent/[0.08] text-accent-300"
            )}
          >
            {session.format === "ONLINE" ? <Video size={10} /> : <MapPin size={10} />}
            {session.format === "ONLINE" ? "Online" : "In-person"}
          </span>
          {session.canManage ? (
            <>
              <SessionFormDialog mode="edit" session={session} hostOptions={hostOptions} />
              <DeleteSessionButton id={session.id} />
            </>
          ) : null}
        </div>
      </div>

      <h3 className="mt-4 text-[1.15rem] font-semibold leading-snug text-ink-50 transition-colors duration-300 group-hover:text-accent-400 sm:text-[1.2rem]">
        {session.title}
      </h3>

      <p className="mt-2.5 text-sm leading-relaxed text-ink-400">
        {session.description}
      </p>

      {session.location && session.format === "IN_PERSON" ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm text-ink-400">
          <MapPin size={13} className="shrink-0 text-accent-400" />
          <span className="truncate">{session.location}</span>
        </p>
      ) : null}

      {session.topics.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {session.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-border-strong/[0.08] bg-surface px-3 py-1 text-xs font-medium tracking-wide text-ink-200"
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "mt-6 grid divide-x divide-white/10 rounded-xl border border-border-strong/[0.06] bg-surface text-center",
          hasEnd ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
        )}
      >
        <div className="flex flex-col items-center gap-1.5 px-2 py-3">
          <Calendar size={14} className="text-accent-400" />
          <span className="text-xs font-medium text-ink-200">{dateLabel}</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-600">Date</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 px-2 py-3">
          <Clock size={14} className="text-accent-400" />
          <span className="text-xs font-medium text-ink-200">{timeLabel}</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-600">Time</span>
        </div>
        {hasEnd ? (
          <div className="flex flex-col items-center gap-1.5 px-2 py-3">
            <Timer size={14} className="text-accent-400" />
            <span className="text-xs font-medium text-ink-200">{durationLabel}</span>
            <span className="text-[10px] uppercase tracking-wider text-ink-600">Duration</span>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-2 text-sm">
<span className="inline-flex items-center gap-1.5 text-ink-400">
            {session.host_type === "BRANCH" ? (
              <Building2 size={13} className="shrink-0 text-accent-400" />
            ) : (
              <Users size={13} className="shrink-0 text-accent-400" />
            )}
            <span className="min-w-0 truncate">
              Hosted by <span className="text-ink-200">{session.host_name}</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-400">
            <User size={13} className="shrink-0 text-accent-400" />
            <span className="min-w-0 truncate">
              Instructor <span className="text-ink-200">{session.instructor}</span>
            </span>
          </span>
      </div>

      <div className="flex-1" />

      {session.capacity != null ? (
        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-400">
          <Users size={12} className="text-accent-400" />
          <span>
            <span className="font-medium text-ink-200">{session.attendee_count}</span>
            {" / "}
            {session.capacity} seats
          </span>
        </div>
      ) : null}

      <SessionJoinButton
        sessionId={session.id}
        isJoined={session.joined}
        isFull={isFull}
        isEnded={isEnded}
        isLive={isLive}
        className="mt-5 w-full"
      />
    </article>
  );
}
