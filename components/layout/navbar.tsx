"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, Shield, ChevronDown, Building2, Users, Rocket, Settings, LogOut } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/data/nav-links";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth.actions";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, loading, isAdmin } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const avatarLetter = profile?.full_name?.[0] ?? profile?.username?.[0] ?? "U";

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6 sm:pt-5">
      <div
        className={cn(
          "w-full max-w-[850px] rounded-full border border-white/[0.08] transition-all duration-700 ease-premium will-change-transform backdrop-blur-2xl",
          isScrolled || isMenuOpen
            ? "bg-[rgba(7,8,13,0.78)] shadow-[0_30px_80px_-25px_rgba(40,40,255,0.18)]"
            : "bg-[rgba(10,11,16,0.18)] shadow-[0_8px_30px_-25px_rgba(255,255,255,0.05)]"
        )}
      >
        <div className="flex h-[64px] items-center px-4 sm:h-[70px] sm:px-6">
          <Logo withWordmark={false} />

          <div className="flex flex-1 items-center justify-center">
            <nav aria-label="Primary" className="flex items-center">
              <ul className="hidden items-center gap-0.5 lg:flex">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <li key={link.href} className="flex">
                      <Link
                        href={link.href}
                        className={cn(
                          "relative rounded-full px-4 py-2 text-[13.5px] font-medium leading-none transition-all duration-300 whitespace-nowrap",
                          "hover:bg-white/[0.06] hover:text-ink-50",
                          active ? "text-ink-50" : "text-ink-400"
                        )}
                      >
                        {link.label}
                        {active && (
                          <span className="absolute -bottom-px left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-gradient-to-r from-accent-400/80 to-accent-400" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {loading ? null : user ? (
              <>
                {isAdmin ? (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10"
                      onClick={() => setIsAdminOpen((v) => !v)}
                      onMouseEnter={() => setIsAdminOpen(true)}
                      onMouseLeave={() => setIsAdminOpen(false)}
                    >
                      <Shield size={14} />
                      Admin
                      <ChevronDown size={12} className="ml-0.5" />
                    </Button>
                    {isAdminOpen ? (
                      <div
                        className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-border-strong bg-[rgba(10,11,16,0.96)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                        onMouseEnter={() => setIsAdminOpen(true)}
                        onMouseLeave={() => setIsAdminOpen(false)}
                      >
                        <Link
                          href="/branches/manage"
                          className="flex items-center gap-2 px-4 py-3 text-sm text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-50"
                          onClick={() => setIsAdminOpen(false)}
                        >
                          <Building2 size={14} />
                          Manage Branches
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div ref={avatarRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAvatarOpen((v) => !v)}
                    className="h-10 w-10 overflow-hidden rounded-full border border-white/[0.12] transition-all duration-300 hover:scale-105 hover:border-accent-400/40 hover:shadow-[0_0_20px_-5px_rgba(109,109,255,0.2)]"
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
                    <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-border-strong bg-[rgba(10,11,16,0.96)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                      <Link
                        href="/profile"
                        onClick={() => setIsAvatarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-50"
                      >
                        <User size={15} />
                        Profile
                      </Link>
                      <Link
                        href="/teams"
                        onClick={() => setIsAvatarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-50"
                      >
                        <Users size={15} />
                        My Teams
                      </Link>
                      <Link
                        href="/projects"
                        onClick={() => setIsAvatarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-50"
                      >
                        <Rocket size={15} />
                        My Projects
                      </Link>
                      <Link
                        href="/profile#account"
                        onClick={() => setIsAvatarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-50"
                      >
                        <Settings size={15} />
                        Settings
                      </Link>
                      <div className="border-t border-border-strong" />
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 transition-colors hover:bg-white/[0.06]"
                        >
                          <LogOut size={15} />
                          Sign Out
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link href="/join">Join Azenion</Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-50 transition-colors duration-200 hover:bg-white/[0.06] lg:hidden"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "absolute left-4 right-4 top-[78px] grid overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[rgba(7,8,13,0.88)] shadow-[0_30px_80px_-25px_rgba(40,40,255,0.18)] backdrop-blur-2xl transition-all duration-[400ms] ease-premium lg:hidden",
          isMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-1 p-5">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "relative rounded-xl px-4 py-3 text-[15px] font-medium transition-colors hover:bg-white/[0.05]",
                    active ? "text-ink-50" : "text-ink-400 hover:text-ink-200"
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-2 left-5 h-[2px] w-5 rounded-full bg-gradient-to-r from-accent-400/80 to-accent-400" />
                  )}
                </Link>
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
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/[0.12]">
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
                    <Link href="/teams" onClick={() => setIsMenuOpen(false)}>
                      <Users size={14} />
                      My Teams
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/projects" onClick={() => setIsMenuOpen(false)}>
                      <Rocket size={14} />
                      My Projects
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile#account" onClick={() => setIsMenuOpen(false)}>
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
