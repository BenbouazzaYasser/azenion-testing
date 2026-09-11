"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  X,
  User,
  Shield,
  Building2,
  Users,
  Rocket,
  Settings,
  LogOut,
  GraduationCap,
  Video,
  FlaskConical,
  Newspaper,
  Megaphone,
  Sparkles,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/data/nav-links";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { LightModeButton } from "@/components/theme/light-mode-button";
import { useTranslation } from "@/components/translation/translation-provider";
import type { DictKey } from "@/lib/translation/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const NotificationCenter = dynamic(
  () => import("@/components/notifications/notification-center").then((m) => m.NotificationCenter),
  { ssr: false },
);
const GlobalSearch = dynamic(
  () => import("@/components/search/global-search").then((m) => m.GlobalSearch),
  { ssr: false },
);

const CHILD_ICONS: Record<string, React.ReactNode> = {
  "/academy/courses": <GraduationCap size={16} />,
  "/academy/live-sessions": <Video size={16} />,
  "/academy/labs": <FlaskConical size={16} />,
  "/feed": <Newspaper size={16} />,
  "/showcase": <Sparkles size={16} />,
  "/announcements": <Megaphone size={16} />,
};

const NAV_LABEL_KEYS: Record<string, DictKey> = {
  "/": "nav.home",
  "/teams": "nav.teams",
  "/projects": "nav.projects",
  "/branches": "nav.branches",
  "/servers": "nav.servers",
  "/community": "nav.community",
  "/chat": "nav.chat",
  "/academy": "nav.academy",
  "/feed": "nav.feed",
  "/showcase": "nav.showcase",
  "/announcements": "nav.announcements",
  "/academy/courses": "nav.courses",
  "/academy/live-sessions": "nav.liveSessions",
  "/academy/labs": "nav.labs",
};

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  user: SupabaseUser | null;
  profile: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  isAdmin: boolean;
  pathname: string;
  pendingNext: string | null;
  hasChatUnread: boolean;
}

export function MobileNavDrawer({
  open,
  onClose,
  user,
  profile,
  isAdmin,
  pathname,
  pendingNext,
  hasChatUnread,
}: MobileNavDrawerProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  const labelOf = (href: string) => t(NAV_LABEL_KEYS[href] ?? "nav.home");
  const avatarLetter = profile?.full_name?.[0] ?? profile?.username?.[0] ?? "U";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" && !pendingNext;
    return pathname.startsWith(href) || (pendingNext?.startsWith(href) ?? false);
  };

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open && !mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[70] xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t("nav.primary")}
    >
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        ref={dialogFocusRef}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[85%] max-w-[330px] flex-col overflow-hidden bg-glass shadow-dropdown backdrop-blur-2xl transition-all duration-300 ease-premium focus:outline-none"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2.5">
          {user ? <NotificationCenter /> : null}
          <GlobalSearch variant="mobile" />
          <LightModeButton />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={cn(
              "-mr-1 rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium",
              "hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-1 p-4">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "relative rounded-xl px-4 py-3 text-[15px] font-medium transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                      active ? "text-ink-50" : "text-ink-400 hover:text-ink-200",
                    )}
                  >
                    {labelOf(link.href)}
                    {link.href === "/chat" && hasChatUnread && (
                      <span
                        aria-hidden
                        className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent-400 shadow-[0_0_10px_rgba(109,109,255,0.9)]"
                      />
                    )}
                    {active && (
                      <span className="absolute bottom-2 left-5 h-[2px] w-5 rounded-full bg-gradient-to-r from-accent-400/80 to-accent-400" />
                    )}
                  </Link>
                  {link.children && link.children.length > 0 ? (
                    <div className="ml-4 pl-2">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                            isActive(child.href)
                              ? "text-accent-300"
                              : "text-ink-500 hover:text-ink-200",
                          )}
                        >
                          {CHILD_ICONS[child.href]}
                          {labelOf(child.href)}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-4">
              {user ? (
                <>
                  {isAdmin ? (
                    <>
                      <Button variant="ghost" asChild>
                        <Link href="/branches/manage" onClick={onClose}>
                          <Shield size={14} />
                          {t("nav.manageBranches")}
                        </Link>
                      </Button>
                      <Button variant="ghost" asChild>
                        <Link href="/admin/roles" onClick={onClose}>
                          <UserCog size={14} />
                          {t("nav.roleManagement")}
                        </Link>
                      </Button>
                      <Button variant="ghost" asChild>
                        <Link href="/admin/instructor-verification" onClick={onClose}>
                          <GraduationCap size={14} />
                          {t("nav.instructorVerification")}
                        </Link>
                      </Button>
                    </>
                  ) : null}

                  <div className="flex items-center gap-3 rounded-xl px-4 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500 to-accent-400 text-[15px] font-semibold text-white">
                          {avatarLetter}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-50">
                        {profile?.full_name || profile?.username || t("nav.userFallback")}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {profile?.username ? `@${profile.username}` : ""}
                      </p>
                    </div>
                  </div>

                  <Button variant="secondary" asChild>
                    <Link href="/profile" onClick={onClose}>
                      <User size={14} />
                      {t("nav.profile")}
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile/my-branches" onClick={onClose}>
                      <Building2 size={14} />
                      {t("nav.myBranches")}
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile/my-teams" onClick={onClose}>
                      <Users size={14} />
                      {t("nav.myTeams")}
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile/my-projects" onClick={onClose}>
                      <Rocket size={14} />
                      {t("nav.myProjects")}
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/settings" onClick={onClose}>
                      <Settings size={14} />
                      {t("nav.settings")}
                    </Link>
                  </Button>
                  <div className="border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start text-red-400 hover:text-red-300"
                      onClick={async () => {
                        const { createClient } = await import("@/lib/supabase/client");
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        window.location.href = "/";
                      }}
                    >
                      <LogOut size={14} />
                      {t("nav.signOut")}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button variant="secondary" asChild>
                    <Link href="/login" onClick={onClose}>{t("nav.login")}</Link>
                  </Button>
                  <Button variant="primary" asChild>
                    <Link href="/join" onClick={onClose}>{t("nav.join")}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
