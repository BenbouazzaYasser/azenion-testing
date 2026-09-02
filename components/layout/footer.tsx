import Link from "next/link";
import { Mail, MessageCircle, Linkedin, Github, Instagram, Twitter } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { CONTACT } from "@/data/contact";
import { serverT } from "@/lib/translation/server";

const SOCIAL_ICONS: Record<string, typeof Twitter> = {
  "X (Twitter)": Twitter,
  LinkedIn: Linkedin,
  Instagram: Instagram,
  GitHub: Github,
  Discord: MessageCircle,
};

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  Email: Mail,
  Discord: MessageCircle,
  LinkedIn: Linkedin,
  GitHub: Github,
};

export function Footer() {
  return (
    <footer className="relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="relative mx-auto max-w-[1320px] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
              {serverT("footer.taglineTop")}
              <br />
              <span className="text-accent-400">{serverT("footer.taglineBottom")}</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              {serverT("footer.description")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">
              {serverT("footer.quickLinks")}
            </h3>
            <ul className="mt-5 space-y-3">
              {[
                { labelKey: "nav.teams" as const, href: "/teams" },
                { labelKey: "nav.projects" as const, href: "/projects" },
                { labelKey: "nav.branches" as const, href: "/branches" },
                { labelKey: "nav.feed" as const, href: "/feed" },
                { labelKey: "nav.chat" as const, href: "/chat" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-400 transition-colors hover:text-ink-50"
                  >
                    {serverT(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">
              {serverT("footer.legal")}
            </h3>
            <ul className="mt-5 space-y-3">
              {[
                { labelKey: "footer.about" as const, href: "/about" },
                { labelKey: "footer.contact" as const, href: "/contact" },
                { labelKey: "footer.terms" as const, href: "/terms" },
                { labelKey: "footer.privacy" as const, href: "/privacy" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-400 transition-colors hover:text-ink-50"
                  >
                    {serverT(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">
              {serverT("footer.connect")}
            </h3>

            <div className="mt-5 flex flex-wrap gap-2">
              {CONTACT.socials.map(({ label, href }) => {
                const Icon = SOCIAL_ICONS[label]!;
                return (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink-400 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:text-accent-400 hover:shadow-glow-sm"
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>

            <div className="mt-6 space-y-3">
              {CONTACT.channels.slice(0, 2).map((channel) => {
                const Icon = CHANNEL_ICONS[channel.label]!;
                return (
                  <a
                    key={channel.label}
                    href={channel.href}
                    target={channel.href.startsWith("http") ? "_blank" : undefined}
                    rel={channel.href.startsWith("http") ? "noreferrer noopener" : undefined}
                    className="group flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/30 hover:bg-surface-hover hover:shadow-glow-sm"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-accent-400 transition-all duration-300 group-hover:border-accent-400/30 group-hover:bg-accent/[0.06]">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.82rem] font-medium text-ink-200 transition-colors group-hover:text-accent-400">
                        {channel.label}
                      </p>
                      <p className="truncate text-[0.75rem] text-ink-600">
                        {channel.detail}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="mx-auto max-w-[1320px] px-5 py-6 sm:px-8 lg:px-12">
          <p className="text-center text-xs text-ink-600 sm:text-left">
            &copy; {new Date().getFullYear()} Azenion. {serverT("footer.rights")}
          </p>
          <p className="mt-2 text-center text-xs text-ink-600/80 sm:text-left">
            {serverT("footer.founded")} Ziyad
          </p>
        </div>
      </div>
    </footer>
  );
}
