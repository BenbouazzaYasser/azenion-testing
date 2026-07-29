import Link from "next/link";
import { Instagram, Linkedin, Twitter } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { NAV_LINKS } from "@/data/nav-links";
import { CONTACT } from "@/data/contact";

const SOCIAL_ICONS: Record<string, typeof Twitter> = {
  "X (Twitter)": Twitter,
  LinkedIn: Linkedin,
  Instagram: Instagram,
};

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col gap-10 py-14 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            United by purpose.
            <br />
            <span className="text-accent-400">Driven by impact.</span>
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2.5 sm:flex sm:flex-wrap sm:gap-x-8">
          {NAV_LINKS.filter((l) => l.href !== "/").map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-400 transition-colors hover:text-ink-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {CONTACT.socials.map(({ label, href }) => {
            const Icon = SOCIAL_ICONS[label]!;
            return (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-ink-400 transition-colors duration-200 hover:border-accent-400/50 hover:text-accent-400"
              >
                <Icon size={15} />
              </a>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border py-6">
        <p className="container text-center text-xs text-ink-600 sm:text-left">
          © {new Date().getFullYear()} Azenion. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
