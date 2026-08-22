"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, Shield, ChevronDown, Building2, Users, Rocket, Settings, LogOut, GraduationCap, Video, FlaskConical, Newspaper, Megaphone, Sparkles } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/data/nav-links";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth.actions";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { GlobalSearch } from "@/components/search/global-search";
import { useChatUnread } from "@/lib/chat-unread";
import { LightModeButton } from "@/components/theme/light-mode-button";

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
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-premium hover:-translate-y-px hover:bg-surface-hover hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
    >
      <span className="flex h-9 w-9 shrink-0 translate-x-0 items-center justify-center rounded-lg border border-border-strong/[0.06] bg-surface text-ink-400 transition-all duration-200 ease-premium group-hover:translate-x-0.5 group-hover:border-accent-400/30 group-hover:bg-accent/[0.08] group-hover:text-accent-300 group-hover:shadow-[0_0_16px_-6px_rgba(40,40,255,0.5)]">
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pendingNext, setPendingNext] = useState<string | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const CHILD_ICONS: Record<string, ReactNode> = {
    "/academy/courses": <GraduationCap size={16} />,
    "/academy/live-sessions": <Video size={16} />,
    "/academy/labs": <FlaskConical size={16} />,
    "/feed": <Newspaper size={16} />,
    "/showcase": <Sparkles size={16} />,
    "/announcements": <Megaphone size={16} />,
  };

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
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (isMenuOpen) {
      drawer.inert = false;
    } else {
      drawer.inert = true;
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setIsAvatarOpen(false);
      }
    }
    if (isAvatarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAvatarOpen]);

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
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6 sm:pt-5">
      <div
        className={cn(
          "w-full xl:w-fit rounded-full border navbar-border transition-[background-color,box-shadow] duration-700 ease-premium will-change-transform backdrop-blur-2xl",
          isScrolled || isMenuOpen
            ? "bg-glass-nav shadow-[0_30px_80px_-25px_rgba(40,40,255,0.18)]"
            : "bg-[rgba(10,11,16,0.18)] shadow-[0_8px_30px_-25px_rgba(255,255,255,0.05)]"
        )}
      >
        <div className="flex h-[64px] items-center justify-between px-4 sm:h-[70px] sm:px-6 xl:justify-start">
          <div className="flex items-center">
            <Logo withWordmark={false} markSize={32} />
          </div>

          <div className="hidden xl:flex xl:ml-4">
            <nav aria-label="Primary" className="flex items-center">
              <ul className="flex items-center gap-4">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  const navLinkClass = cn(
                    "relative inline-flex items-center rounded-full border border-transparent px-4 py-2 text-[13.5px] font-medium leading-none transition-all duration-300 whitespace-nowrap",
                    "hover:bg-surface-hover hover:text-ink-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                    active
                      ? "border-accent bg-surface text-ink-50 shadow-[0_0_18px_-6px_rgba(40,40,255,0.4)]"
                      : "text-ink-400"
                  );

                  if (link.children && link.children.length > 0) {
                    const isDropdownOpen = openDropdown === link.href;
                    return (
                      <li key={link.href} className="flex">
                        <div
                          className="relative"
                          onMouseEnter={() => setOpenDropdown(link.href)}
                          onMouseLeave={() => setOpenDropdown(null)}
                          onFocus={() => setOpenDropdown(link.href)}
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                              setOpenDropdown(null);
                            }
                          }}
                        >
                          <Link href={link.href} className={navLinkClass} aria-haspopup="true" aria-expanded={isDropdownOpen}>
                            {link.label}
                            <ChevronDown size={12} className="ml-1 opacity-60" />
                          </Link>
                          {isDropdownOpen ? (
                            <div className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2">
                              <div aria-hidden className="absolute -top-3 left-0 right-0 h-3" />
                              <div className="relative overflow-hidden rounded-2xl border border-border-strong/[0.1] bg-glass shadow-dropdown backdrop-blur-2xl backdrop-saturate-150 animate-dropdown-in">
                                <div
                                  aria-hidden
                                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/80 to-transparent"
                                />
                                <div
                                  aria-hidden
                                  className="pointer-events-none absolute -top-16 right-0 h-32 w-32 rounded-full bg-accent/30 blur-[64px]"
                                />
                                <div className="px-2.5 pb-3 pt-2">
                                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
                                    {link.label}
                                  </p>
                                  {link.children.map((child) => (
                                    <MenuLink
                                      key={child.href}
                                      href={child.href}
                                      icon={CHILD_ICONS[child.href]}
                                      title={child.label}
                                      description={child.description}
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
                        {link.label}
                        {link.href === "/chat" && hasChatUnread && (
                          <span
                            aria-hidden
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-400 shadow-[0_0_10px_rgba(109,109,255,0.9)]"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="flex items-center justify-end gap-2 xl:ml-4">
            <div className="hidden items-center gap-2 xl:flex">
            <GlobalSearch variant="desktop" />
            {loading ? null : user ? (
              <>
                {isAdmin ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setIsAdminOpen(true)}
                    onMouseLeave={() => setIsAdminOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10"
                      aria-expanded={isAdminOpen}
                      onClick={() => setIsAdminOpen((v) => !v)}
                    >
                      <Shield size={14} />
                      Admin
                      <ChevronDown size={12} className="ml-0.5" />
                    </Button>
                    {isAdminOpen ? (
                      <div className="absolute right-0 top-full mt-3 w-72">
                        <div
                          aria-hidden
                          className="absolute -top-3 left-0 right-0 h-3"
                        />
                        <div className="relative overflow-hidden rounded-2xl border border-border-strong/[0.1] bg-glass shadow-dropdown backdrop-blur-2xl backdrop-saturate-150 animate-dropdown-in">
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/80 to-transparent"
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute -top-16 right-0 h-32 w-32 rounded-full bg-accent/30 blur-[64px]"
                        />

                        <div className="relative flex items-center gap-3.5 px-5 pb-4 pt-5">
                          <div className="relative shrink-0">
                            <div
                              aria-hidden
                              className="absolute -inset-2 rounded-full bg-accent/35 blur-xl"
                            />
                            <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-accent-400/25 bg-gradient-to-br from-accent/[0.18] to-accent/[0.04] text-accent-300 shadow-[0_0_24px_-6px_rgba(109,109,255,0.6)]">
                              <Shield size={22} />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold leading-tight text-ink-50">
                              Administrator
                            </p>
                            <p className="mt-0.5 truncate text-xs text-accent-300/80">
                              Full platform access
                            </p>
                          </div>
                        </div>

                        <div className="relative">
                          <div
                            aria-hidden
                            className="mx-5 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
                          />
                          <div
                            aria-hidden
                            className="mx-5 h-px bg-gradient-to-r from-accent-300/0 via-accent-300/25 to-accent-300/0"
                          />
                        </div>

                        <div className="px-2.5 pb-3 pt-2">
                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
                            Management
                          </p>
                          <MenuLink
                            href="/branches/manage"
                            icon={<Building2 size={16} />}
                            title="Manage Branches"
                            description="Create and organize communities"
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
                    className="h-10 w-10 overflow-hidden rounded-full border navbar-element-border transition-all duration-300 hover:scale-105 hover:border-accent-400/40 hover:shadow-[0_0_20px_-5px_rgba(109,109,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500 to-accent-400 text-[15px] font-semibold text-white">
                        {avatarLetter}
                      </span>
                    )}
                  </button>
                  {isAvatarOpen ? (
                    <div className="absolute right-0 top-full mt-3 w-72 origin-top-right overflow-hidden rounded-2xl border navbar-panel-border bg-glass shadow-dropdown backdrop-blur-2xl backdrop-saturate-150 animate-dropdown-in">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/60 to-transparent"
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -top-16 right-0 h-32 w-32 rounded-full bg-accent/20 blur-[64px]"
                      />

                      <div className="relative flex items-center gap-3.5 px-5 pb-4 pt-5">
                        <div className="relative shrink-0">
                          <div
                            aria-hidden
                            className="absolute -inset-2 rounded-full bg-accent/25 blur-xl"
                          />
                          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-border-strong/[0.14] shadow-[0_0_24px_-8px_rgba(109,109,255,0.5)]">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-500 to-accent-400 text-lg font-semibold text-white">
                                {avatarLetter}
                              </span>
                            )}
                          </div>
                          <span
                            aria-hidden
                            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-void-900 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold leading-tight text-ink-50">
                            {profile?.full_name || profile?.username || "User"}
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
                          className="mx-5 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
                        />
                        <div
                          aria-hidden
                          className="mx-5 h-px bg-gradient-to-r from-accent-400/0 via-accent-400/20 to-accent-400/0"
                        />
                      </div>

                      <div className="px-2.5 pb-2.5 pt-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
                          Workspace
                        </p>
                        <MenuLink
                          href="/profile/my-branches"
                          icon={<Building2 size={16} />}
                          title="My Branches"
                          description="Your communities"
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                        <MenuLink
                          href="/profile/my-teams"
                          icon={<Users size={16} />}
                          title="My Teams"
                          description="View and manage your teams"
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                        <MenuLink
                          href="/profile/my-projects"
                          icon={<Rocket size={16} />}
                          title="My Projects"
                          description="Continue building"
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                      </div>

                      <div className="relative">
                        <div
                          aria-hidden
                          className="mx-5 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
                        />
                        <div
                          aria-hidden
                          className="mx-5 h-px bg-gradient-to-r from-accent-400/0 via-accent-400/20 to-accent-400/0"
                        />
                      </div>

                      <div className="px-2.5 pb-2.5 pt-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
                          Account
                        </p>
                        <MenuLink
                          href="/profile"
                          icon={<User size={16} />}
                          title="Profile"
                          description="Manage your account"
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                        <MenuLink
                          href="/settings"
                          icon={<Settings size={16} />}
                          title="Settings"
                          description="Preferences and security"
                          onNavigate={() => setIsAvatarOpen(false)}
                        />
                      </div>

                      <div className="relative">
                        <div
                          aria-hidden
                          className="mx-5 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
                        />
                        <div
                          aria-hidden
                          className="mx-5 h-px bg-gradient-to-r from-red-400/0 via-red-400/20 to-red-400/0"
                        />
                      </div>

                      <div className="px-2.5 pb-3 pt-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
                          Danger Zone
                        </p>
                        <form action={signOut}>
                          <button
                            type="submit"
                            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-premium hover:-translate-y-px hover:bg-red-500/[0.08] hover:shadow-[0_0_24px_-10px_rgba(248,113,113,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                          >
                            <span className="flex h-9 w-9 shrink-0 translate-x-0 items-center justify-center rounded-lg border border-border-strong/[0.06] bg-surface text-ink-400 transition-all duration-200 ease-premium group-hover:translate-x-0.5 group-hover:border-red-400/30 group-hover:bg-red-500/[0.1] group-hover:text-red-400">
                              <LogOut size={16} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13.5px] font-medium text-ink-200 transition-colors duration-200 group-hover:text-red-300">
                                Sign Out
                              </span>
                              <span className="block truncate text-xs text-ink-600 transition-colors duration-200 group-hover:text-red-400/70">
                                End this session
                              </span>
                            </span>
                          </button>
                        </form>
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
                  <Link href="/login">Log in</Link>
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
                  <Link href="/join">Join Azenion</Link>
                </Button>
              </>
            )}
            </div>

            <div className="xl:hidden">{user ? <NotificationCenter /> : null}</div>

            <div className="xl:hidden">
              <GlobalSearch variant="mobile" />
            </div>

            <LightModeButton />

            <button
              type="button"
              ref={toggleRef}
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-50 transition-all duration-300 hover:scale-105 hover:bg-surface-hover hover:border-accent-400/40 hover:shadow-[0_0_18px_-6px_rgba(109,109,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 xl:hidden"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={drawerRef}
        aria-hidden={!isMenuOpen}
        className={cn(
          "absolute left-4 right-4 top-[78px] grid overflow-hidden rounded-[1.5rem] border navbar-border bg-glass-nav shadow-[0_30px_80px_-25px_rgba(40,40,255,0.18)] backdrop-blur-2xl transition-all duration-[400ms] ease-premium xl:hidden",
          isMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 max-h-[calc(100dvh_-_112px)] overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-1 p-5">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "relative rounded-xl px-4 py-3 text-[15px] font-medium transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                      active ? "text-ink-50" : "text-ink-400 hover:text-ink-200"
                    )}
                  >
                    {link.label}
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
                    <div className="ml-4 border-l border-border-strong/[0.06] pl-2">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                            isActive(child.href)
                              ? "text-accent-300"
                              : "text-ink-500 hover:text-ink-200"
                          )}
                        >
                          {CHILD_ICONS[child.href]}
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-5">
              {user ? (
                <>
                  {isAdmin ? (
                    <Button variant="ghost" asChild>
                      <Link href="/branches/manage" onClick={() => setIsMenuOpen(false)}>
                        <Shield size={14} />
                        Manage Branches
                      </Link>
                    </Button>
                  ) : null}
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border-strong/[0.12]">
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
                        {profile?.full_name || profile?.username || "User"}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {profile?.username ? `@${profile.username}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button variant="secondary" asChild>
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <User size={14} />
                      Profile
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile/my-branches" onClick={() => setIsMenuOpen(false)}>
                      <Building2 size={14} />
                      My Branches
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile/my-teams" onClick={() => setIsMenuOpen(false)}>
                      <Users size={14} />
                      My Teams
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile/my-projects" onClick={() => setIsMenuOpen(false)}>
                      <Rocket size={14} />
                      My Projects
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/settings" onClick={() => setIsMenuOpen(false)}>
                      <Settings size={14} />
                      Settings
                    </Link>
                  </Button>
                  <div className="border-t border-border pt-3">
                    <form action={signOut}>
                      <Button type="submit" variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300">
                        <LogOut size={14} />
                        Sign Out
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <Button variant="secondary" asChild>
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>Log in</Link>
                  </Button>
                  <Button variant="primary" asChild>
                    <Link href="/join" onClick={() => setIsMenuOpen(false)}>Join Azenion</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
