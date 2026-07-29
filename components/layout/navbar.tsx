"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/data/nav-links";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6 sm:pt-5">
      <div
        className={cn(
          "w-full max-w-[1000px] rounded-full border border-white/[0.08] transition-all duration-700 ease-premium will-change-transform backdrop-blur-2xl",
          isScrolled || isMenuOpen
            ? "bg-[rgba(7,8,13,0.78)] shadow-[0_30px_80px_-25px_rgba(40,40,255,0.18)]"
            : "bg-[rgba(10,11,16,0.18)] shadow-[0_8px_30px_-25px_rgba(255,255,255,0.05)]"
        )}
      >
        <nav
          aria-label="Primary"
          className="flex h-[64px] items-center justify-between px-4 sm:h-[70px] sm:px-6"
        >
          <Logo withWordmark={false} />

          <ul className="hidden items-center gap-0.5 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-[13.5px] font-medium transition-all duration-300",
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

          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/join">Join Azenion</Link>
            </Button>
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
        </nav>
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
              <Button variant="secondary" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="primary" asChild>
                <Link href="/join">Join Azenion</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
