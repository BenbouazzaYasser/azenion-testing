"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { User, Shield, ChevronDown, Building2, Users, Rocket, Settings, LogOut, GraduationCap, Route, Video, FlaskConical, Newspaper, Megaphone, Sparkles, UserCog, Menu, X } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/data/nav-links";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useChatUnread } from "@/lib/chat-unread";
import { LightModeButton } from "@/components/theme/light-mode-button";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import {
  MOBILE_NAV_CHANGE_EVENT,
  setMobileNavOpen,
} from "@/components/layout/mobile-nav-vanilla";
import { useTranslation } from "@/components/translation/translation-provider";
import type { DictKey } from "@/lib/translation/types";

const NotificationCenter = dynamic(
  () => import("@/components/notifications/notification-center").then((m) => m.NotificationCenter),
  { ssr: false },
);
const GlobalSearch = dynamic(
  () => import("@/components/search/global-search").then((m) => m.GlobalSearch),
  { ssr: false },
);

interface MenuLinkProps {
  href: string;
  icon: ReactNode;
  title: string;
  description?: string;
  onNavigate: () => void;
}

function MenuLink({ href, icon, title, description, onNavigate }: MenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-accent/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
    >
      <span className="flex h-9 w-9 shrink-0 translate-x-0 items-center justify-center rounded-lg border border-border bg-surface text-ink-400 transition-colors duration-150 ease-out group-hover:border-accent-400/30 group-hover:bg-accent/[0.08] group-hover:text-accent-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-ink-200 transition-colors duration-200 group-hover:text-ink-50">
          {title}
        </span>
        {description ? (
          <span className="block truncate text-xs text-ink-600 transition-colors duration-200 group-hover:text-ink-500">
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}


export function Navbar() {
  const pathname = usePathname();
  const { user, profile, loading, isAdmin } = useUser();
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  // Mirrors the vanilla controller's DOM truth (data-open on
  // #mobile-nav-drawer) for the toggle icon/aria only. The tap path itself
  // never goes through React, so the menu works before hydration.
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(
    () =>
      typeof document !== "undefined" &&
      document.getElementById("mobile-nav-drawer")?.dataset.open === "true",
  );
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pendingNext, setPendingNext] = useState<string | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const CHILD_ICONS: Record<string, ReactNode> = {
    "/academy/courses": <GraduationCap size={16} />,
    "/academy/roadmaps": <Route size={16} />,
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
    "/academy/roadmaps": "nav.roadmaps",
    "/academy/live-sessions": "nav.liveSessions",
    "/academy/labs": "nav.labs",
  };

  const NAV_DESC_KEYS: Record<string, DictKey> = {
    "/feed": "nav.feedDesc",
    "/showcase": "nav.showcaseDesc",
    "/announcements": "nav.announcementsDesc",
    "/academy/courses": "nav.coursesDesc",
    "/academy/roadmaps": "nav.roadmapsDesc",
    "/academy/live-sessions": "nav.liveSessionsDesc",
    "/academy/labs": "nav.labsDesc",
  };

  const labelOf = (href: string) => t(NAV_LABEL_KEYS[href] ?? "nav.home");
  const descOf = (href: string) => (NAV_DESC_KEYS[href] ? t(NAV_DESC_KEYS[href]) : undefined);

  const avatarLetter = profile?.full_name?.[0] ?? profile?.username?.[0] ?? "U";

  const chatUnread = useChatUnread(user?.id ?? null);
  const hasChatUnread = Object.values(chatUnread).some((c) => c > 0);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sync = () => {
      setIsMenuOpen(
        document.getElementById("mobile-nav-drawer")?.dataset.open === "true",
      );
    };
    sync();
    window.addEventListener(MOBILE_NAV_CHANGE_EVENT, sync);
    return () => window.removeEventListener(MOBILE_NAV_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    setMobileNavOpen(false);
    setOpenDropdown(null);
    setIsAdminOpen(false);
    setIsAvatarOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        (avatarRef.current && avatarRef.current.contains(target)) ||
        (adminRef.current && adminRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      setIsAvatarOpen(false);
      setIsAdminOpen(false);
      setOpenDropdown(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsAvatarOpen(false);
        setIsAdminOpen(false);
        setOpenDropdown(null);
      }
    }

    if (isAvatarOpen || isAdminOpen || openDropdown !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAvatarOpen, isAdminOpen, openDropdown]);

  // If we were bounced to /login?next=..., keep the intended page highlighted.
  useEffect(() => {
    let next: string | null = null;
    try {
      const raw = new URLSearchParams(window.location.search).get("next");
      if (raw && raw.startsWith("/")) next = raw;
    } catch {}
    setPendingNext(next);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" && !pendingNext;
    return pathname.startsWith(href) || (pendingNext?.startsWith(href) ?? false);
  };

  return (
    <header
      dir="ltr"
      className="fixed inset-x-0 top-0 z-50 flex justify-center"
    >
      <div
        className={cn(
          "hidden xl:block w-full xl:w-fit rounded-none border-x border-b navbar-border transition-colors duration-150 ease-out",
          isScrolled || isMenuOpen
            ? "bg-void-900"
            : "bg-void-950"
        )}
      >
        <div className="flex h-[64px] items-center justify-between gap-3 px-4 sm:h-[70px] sm:px-6 xl:justify-start xl:gap-5">
          <div className="flex shrink-0 items-center pr-1">
            <Logo withWordmark={false} markSize={32} priority />
          </div>

          <div className="hidden xl:flex xl:ms-2">
            <nav aria-label={t("nav.primary")} className="flex items-center">
              <ul className="flex items-center gap-4">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  const navLinkClass = cn(
                    "relative inline-flex items-center rounded-lg px-4 py-2 text-[13.5px] font-semibold leading-none transition-colors duration-150 whitespace-nowrap",
                    "hover:bg-accent/[0.08] hover:text-ink-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                    active
                      ? "bg-accent/10 text-ink-50 shadow-[inset_0_0_0_1px_rgb(var(--accent-primary)/0.18)]"
                      : "text-ink-400"
                  );

                  if (link.children && link.children.length > 0) {
                    const isDropdownOpen = openDropdown === link.href;
                    return (
                      <li key={link.href} className="flex">
                        <div
                          ref={openDropdown === link.href ? dropdownRef : undefined}
                          className="relative"
                          onMouseEnter={() => setOpenDropdown(link.href)}
                          onMouseLeave={() => setOpenDropdown(null)}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(isDropdownOpen ? null : link.href)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOpenDropdown(isDropdownOpen ? null : link.href);
                              }
                            }}
                            className={navLinkClass}
                            aria-haspopup="true"
                            aria-expanded={isDropdownOpen}
                            aria-controls={`dropdown-${link.href.replace(/\//g, "-")}`}
                          >
                            <span>{labelOf(link.href)}</span>
                            <ChevronDown size={12} className={cn("ml-1 opacity-60 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                          </button>
                          {isDropdownOpen ? (
                            <div
                              id={`dropdown-${link.href.replace(/\//g, "-")}`}
                              className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2"
                            >
                              <div aria-hidden className="absolute -top-3 left-0 right-0 h-3" />
                              <div className="relative overflow-hidden rounded-xl border border-border bg-void-900 shadow-dropdown animate-dropdown-in">
                                <div
                                  aria-hidden
                                  className="border-b border-border"
                                />
                                <div className="border-t border-border" aria-hidden />
                                <div className="px-2.5 pb-3 pt-2">
                                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
                                    {labelOf(link.href)}
                                  </p>
                                  {link.children.map((child) => (
                                    <MenuLink
                                      key={child.href}
                                      href={child.href}
                                      icon={CHILD_ICONS[child.href]}
                                      title={labelOf(child.href)}
                                      description={descOf(child.href)}
                                      onNavigate={() => setOpenDropdown(null)}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={link.href} className="flex">
                      <Link href={link.href} className={navLinkClass}>
                        {labelOf(link.href)}
                        {link.href === "/chat" && hasChatUnread && (
                          <span
                            aria-hidden
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-400 shadow-none"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="flex items-center justify-end gap-2 xl:ms-6">
            <div className="hidden items-center gap-2 xl:flex">
            <GlobalSearch variant="desktop" />
            {loading ? null : user ? (
              <>
                {isAdmin ? (
                  <div
                    ref={adminRef}
                    className="relative"
                    onMouseEnter={() => setIsAdminOpen(true)}
                    onMouseLeave={() => setIsAdminOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10"
                      aria-haspopup="true"
                      aria-expanded={isAdminOpen}
                      aria-controls="admin-dropdown-menu"
                      onClick={() => setIsAdminOpen((v) => !v)}
                    >
                      <Shield size={14} />
                      {t("nav.admin")}
                      <ChevronDown size={12} className={cn("ml-0.5 transition-transform duration-200", isAdminOpen && "rotate-180")} />
                    </Button>
                    {isAdminOpen ? (
                      <div id="admin-dropdown-menu" className="absolute right-0 top-full mt-3 w-72">
                        <div
                          aria-hidden
                          className="absolute -top-3 left-0 right-0 h-3"
                        />
                        <div className="relative overflow-hidden rounded-sm border border-border bg-void-900 shadow-dropdown animate-dropdown-in">
                        <div
                          aria-hidden
                          className="border-b border-border"
                        />
                        <div className="border-t border-border" aria-hidden />

                        <div className="relative flex items-center gap-3.5 px-5 pb-4 pt-5">
                          <div className="relative shrink-0">
                            <div className="border-t border-border" aria-hidden />
                            <div className="relative flex h-14 w-14 items-center justify-center rounded-sm border border-accent-400/25 bg-surface text-accent-300">
                              <Shield size={22} />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold leading-tight text-ink-50">
                              {t("nav.administrator")}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-accent-300/80">
                              {t("nav.fullAccess")}
                            </p>
                          </div>
                        </div>

                        <div className="relative">
                          <div
                            aria-hidden
                            className="mx-5 h-px border-t border-border"
                          />
                          <div
                            aria-hidden
                            className="mx-5 h-px border-t border-border"
                          />
                        </div>

                        <div className="px-2.5 pb-3 pt-2">
                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
                            {t("nav.management")}
                          </p>
                          <MenuLink
                            href="/branches/manage"
                            icon={<Building2 size={16} />}
                            title={t("nav.manageBranches")}
                            description={t("nav.manageBranchesDesc")}
                            onNavigate={() => setIsAdminOpen(false)}
                          />
                          <MenuLink
                            href="/admin/roles"
                            icon={<UserCog size={16} />}
                            title={t("nav.roleManagement")}
                            description={t("nav.roleManagementDesc")}
                            onNavigate={() => setIsAdminOpen(false)}
                          />
                          <MenuLink
                            href="/admin/instructor-verification"
                            icon={<GraduationCap size={16} />}
                            title={t("nav.instructorVerification")}
                            description={t("nav.instructorVerificationDesc")}
                            onNavigate={() => setIsAdminOpen(false)}
                          />
                        </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <NotificationCenter />
                <div ref={avatarRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAvatarOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={isAvatarOpen}
                    className="h-10 w-10 overflow-hidden rounded-full border navbar-element-border transition-colors duration-150 hover:border-accent-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} alt="" width={40} height={40} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-accent-500 text-[15px] font-semibold text-white">
                        {avatarLetter}
                      </span>
                    )}
                  </button>
                  {isAvatarOpen ? (
                    <div className="absolute right-0 top-full mt-3 w-72 origin-top-right overflow-hidden rounded-sm border navbar-panel-border bg-void-900 shadow-dropdown animate-dropdown-in">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-px border-t border-border"
                      />
                      <div className="border-b border-border" aria-hidden />

                      <div className="relative flex items-center gap-3.5 px-5 pb-4 pt-5">
                        <div className="relative shrink-0">
                          <div className="border-t border-border" aria-hidden />
                          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-border">
                            {profile?.avatar_url ? (
                              <Image src={profile.avatar_url} alt="" width={56} height={56} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-accent-500 text-lg font-semibold text-white">
                                {avatarLetter}
                              </span>
                            )}
                          </div>
                          <span
                            aria-hidden
                            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-void-900 bg-emerald-400 shadow-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold leading-tight text-ink-50">
                            {profile?.full_name || profile?.username || t("nav.userFallback")}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-500">
                            {profile?.username
                              ? `@${profile.username}`
                              : user?.email ?? ""}
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <div
                          aria-hidden
                          className="mx-5 h-px border-t border-border"
                        />
                        <div
                          aria-hidden
                          className="mx-5 h-px border-t border-border"
                        />
                      </div>

                      <div className="px-2.5 pb-2.5 pt-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
                          {t("nav.workspace")}
                        </p>
                        <MenuLink
                          href="/profile/my-branches"
                          icon={<Building2 size={16} />}
                          title={t("nav.myBranches")}
                          description={t("nav.myBranchesDesc")}
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                        <MenuLink
                          href="/profile/my-teams"
                          icon={<Users size={16} />}
                          title={t("nav.myTeams")}
                          description={t("nav.myTeamsDesc")}
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                        <MenuLink
                          href="/profile/my-projects"
                          icon={<Rocket size={16} />}
                          title={t("nav.myProjects")}
                          description={t("nav.myProjectsDesc")}
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                      </div>

                      <div className="relative">
                        <div
                          aria-hidden
                          className="mx-5 h-px border-t border-border"
                        />
                        <div
                          aria-hidden
                          className="mx-5 h-px border-t border-border"
                        />
                      </div>

                      <div className="px-2.5 pb-2.5 pt-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
                          {t("nav.account")}
                        </p>
                        <MenuLink
                          href="/profile"
                          icon={<User size={16} />}
                          title={t("nav.profile")}
                          description={t("nav.profileDesc")}
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                        <MenuLink
                          href="/settings"
                          icon={<Settings size={16} />}
                          title={t("nav.settings")}
                          description={t("nav.settingsDesc")}
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                      </div>

                      <div className="relative">
                        <div
                          aria-hidden
                          className="mx-5 h-px border-t border-border"
                        />
                        <div
                          aria-hidden
                          className="mx-5 h-px border-t border-red-400/30"
                        />
                      </div>

                      <div className="px-2.5 pb-3 pt-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
                          {t("nav.dangerZone")}
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            const supabase = await createClient();
                            await supabase.auth.signOut();
                            window.location.href = "/";
                          }}
                          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-premium hover:bg-red-500/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                        >
                            <span className="flex h-9 w-9 shrink-0 translate-x-0 items-center justify-center rounded-lg bg-surface text-ink-400 transition-all duration-200 ease-premium group-hover:translate-x-0.5 group-hover:border-red-400/30 group-hover:bg-red-500/[0.1] group-hover:text-red-400">
                              <LogOut size={16} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13.5px] font-medium text-ink-200 transition-colors duration-200 group-hover:text-red-300">
                                {t("nav.signOut")}
                              </span>
                              <span className="block truncate text-xs text-ink-600 transition-colors duration-200 group-hover:text-red-400/70">
                                {t("nav.signOutDesc")}
                              </span>
                            </span>
                          </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className={cn(
                    pathname === "/login" &&
                      "border-accent-400/60 bg-surface-hover text-ink-50"
                  )}
                >
                  <Link href="/login">{t("nav.login")}</Link>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  asChild
                  className={cn(
                    pathname === "/join" &&
                      "ring-1 ring-accent-300/60 ring-offset-2 ring-offset-void-950"
                  )}
                >
                  <Link href="/join">{t("nav.join")}</Link>
                </Button>
              </>
            )}
            </div>

            <LightModeButton />
          </div>
        </div>
      </div>

      <div className="fixed left-4 top-4 z-50 xl:hidden">
        <Logo
          withWordmark={false}
          markSize={44}
          priority
          className="h-16 w-16 justify-center rounded-sm ring-1 ring-inset ring-border bg-void-900 transition-colors duration-150 ease-out hover:border-accent-400/50 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
        />
      </div>

      <button
        type="button"
        data-mobile-nav-toggle
        aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
        aria-expanded={isMenuOpen}
        aria-controls="mobile-nav-drawer"
        className="fixed right-4 top-4 z-50 flex h-16 w-16 touch-manipulation select-none items-center justify-center rounded-sm ring-1 ring-inset ring-border bg-void-900 text-ink-50 transition-colors duration-150 ease-out hover:border-accent-400/50 hover:bg-surface-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 xl:hidden"
      >
        <span aria-hidden="true" className="relative flex h-6 w-6 items-center justify-center">
          <Menu
            size={24}
            className={cn(
              "absolute transition-all duration-300",
              isMenuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
            )}
          />
          <X
            size={24}
            className={cn(
              "absolute transition-all duration-300",
              isMenuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
            )}
          />
        </span>
      </button>

      <MobileNavDrawer
        open={isMenuOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
        profile={profile}
        isAdmin={isAdmin}
        pathname={pathname}
        pendingNext={pendingNext}
        hasChatUnread={hasChatUnread}
      />
    </header>
  );
}
