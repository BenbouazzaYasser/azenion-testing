"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCheck,
  Heart,
  MessageSquare,
  MessageCircle,
  AtSign,
  Sparkles,
  Megaphone,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { formatDistanceToNow } from "@/lib/date";
import { useUser } from "@/hooks/use-user";
import { subscribeToNotifications } from "@/lib/notification-realtime";
import {
  getNotificationsAction,
  getUnreadNotificationCount,
  markNotificationsRead,
  markNotificationRead,
  resolveNotificationTarget,
  type AppNotification,
} from "@/actions/notifications.actions";

interface TypeConfig {
  icon: typeof Bell;
  label: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  liked_your_update: { icon: Heart, label: "liked your update" },
  liked_your_comment: { icon: Heart, label: "liked your comment" },
  commented_on_your_update: { icon: MessageSquare, label: "commented on your update" },
  replied_to_your_comment: { icon: MessageCircle, label: "replied to your comment" },
  mentioned_you: { icon: AtSign, label: "mentioned you" },
  announcement: {
    icon: Megaphone,
    label: "posted a new announcement",
  },
  platform_announcement: {
    icon: Megaphone,
    label: "posted a new announcement",
  },
  friend_request_received: { icon: UserPlus, label: "sent you a friend request" },
  friend_request_accepted: { icon: UserCheck, label: "accepted your friend request" },
  new_follower: { icon: UserPlus, label: "started following you" },
};

const DEFAULT_TYPE: TypeConfig = { icon: Sparkles, label: "sent you a notification" };

function getPreview(n: AppNotification): string | null {
  const meta = n.metadata ?? {};
  const raw =
    typeof meta.comment_preview === "string"
      ? meta.comment_preview
      : typeof meta.preview === "string"
        ? meta.preview
        : null;
  return raw ? raw.replace(/^"|"$/g, "") : null;
}

function NotificationAvatar({
  notification,
}: {
  notification: AppNotification;
}) {
  const actor = notification.actor;
  if (actor?.avatar_url) {
    return (
      <img
        src={actor.avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-border-strong/[0.12] object-cover"
      />
    );
  }
  if (actor?.full_name || actor?.username) {
    const initial = actor.full_name?.[0] ?? actor.username?.[0]?.toUpperCase() ?? "?";
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-glow text-xs font-semibold text-white">
        {initial}
      </span>
    );
  }
  const Icon = TYPE_CONFIG[notification.type]?.icon ?? DEFAULT_TYPE.icon;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.1] bg-surface text-ink-400">
      <Icon size={16} />
    </span>
  );
}

function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  const unread = !notification.read;
  const config = TYPE_CONFIG[notification.type] ?? DEFAULT_TYPE;
  const preview = getPreview(notification);
  const actorName =
    notification.actor?.full_name ?? notification.actor?.username ?? "Someone";

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "group relative flex w-full cursor-pointer gap-3 rounded-xl px-3.5 py-3 text-left transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
        unread
          ? "bg-surface hover:bg-surface-hover"
          : "hover:bg-surface-hover",
      )}
    >
      {unread && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-accent-400 to-accent-glow"
        />
      )}

      <NotificationAvatar notification={notification} />

      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug">
          <span
            className={cn(
              "break-words font-semibold",
              unread ? "text-ink-50" : "text-ink-300",
            )}
          >
            {actorName}
          </span>{" "}
          <span
            className={cn(
              "break-words",
              unread ? "text-ink-300" : "text-ink-500",
            )}
          >
            {config.label}
          </span>
        </p>

        {preview ? (
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-xs leading-relaxed",
              unread ? "text-ink-500" : "text-ink-600",
            )}
          >
            {preview}
          </p>
        ) : null}

        {notification.created_at ? (
          <p className="mt-1 text-[10px] font-medium tracking-wide text-ink-600 transition-colors duration-200 group-hover:text-ink-500">
            {formatDistanceToNow(new Date(notification.created_at))}
          </p>
        ) : null}
      </div>

      {unread && (
        <span
          aria-hidden
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent shadow-glow-sm",
            notification.created_at
              ? "shadow-[0_0_10px_rgba(40,40,255,0.9)]"
              : "",
          )}
        />
      )}
    </button>
  );
}

export function NotificationCenter() {
  const { user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const userId = user?.id ?? null;

  const loadUnread = useCallback(async () => {
    if (!userId) return;
    const count = await getUnreadNotificationCount(userId);
    setUnreadCount(count);
  }, [userId]);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToNotifications(userId, () => {
      setUnreadCount((c) => c + 1);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setOpen(false);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && userId) {
      setLoading(true);
      const items = await getNotificationsAction(userId, 20);
      setNotifications(Array.isArray(items) ? items : []);
      setLoading(false);
    }
  };

  const handleOpenNotification = async (n: AppNotification) => {
    setOpen(false);

    if (!n.read) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      void markNotificationRead(n.id);
    }

    const path = await resolveNotificationTarget(n.type, n.target_type, n.target_id);
    if (path) {
      router.push(path);
    }
  };

  const handleMarkAllRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markNotificationsRead(userId);
  };

  if (!userId) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        onClick={handleOpen}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border navbar-element-border text-ink-400 transition-all duration-300 ease-premium hover:scale-105 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-[0_0_20px_-5px_rgba(109,109,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-void-900">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-3 flex w-[min(24rem,calc(100vw-2rem))] animate-dropdown-in flex-col overflow-hidden rounded-2xl border navbar-panel-border bg-glass shadow-dropdown backdrop-blur-2xl backdrop-saturate-150 max-lg:fixed max-lg:inset-x-4 max-lg:mx-auto max-lg:top-[72px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/60 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-14 right-0 h-32 w-32 rounded-full bg-accent/20 blur-[64px]"
          />

          <div className="relative flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink-50">Notifications</h2>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/[0.16] px-1.5 text-[11px] font-semibold tabular-nums text-accent-300 ring-1 ring-accent-400/30">
                  {unreadCount}
                </span>
              )}
            </div>
            {notifications.length > 0 && unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-accent-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 hover:text-accent-300"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            ) : null}
          </div>

          <div
            aria-hidden
            className="relative mx-4 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
          />

          <div
            className={cn(
              "relative max-h-[min(22rem,60vh)] overflow-y-auto overscroll-contain",
              SCROLLBAR_CLASSES,
            )}
          >
            {loading ? (
              <div className="flex flex-col gap-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse gap-3 rounded-xl px-3.5 py-3"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full bg-surface" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-3/5 rounded-full bg-surface" />
                      <div className="h-2.5 w-4/5 rounded-full bg-surface" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                  <BellOff size={24} />
                </div>
                <p className="mt-4 text-sm font-medium text-ink-200">
                  You&apos;re all caught up
                </p>
                <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-ink-600">
                  Likes, comments and mentions from your communities will show up
                  here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col p-2.5 pb-3">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onOpen={handleOpenNotification}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            aria-hidden
            className="relative mx-4 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
          />
          <p className="relative px-4 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-ink-600">
            Azenion
          </p>
        </div>
      ) : null}
    </div>
  );
}