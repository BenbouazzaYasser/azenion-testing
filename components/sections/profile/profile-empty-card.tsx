import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ProfileEmptyCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  cardClass: string;
}

export function ProfileEmptyCard({
  icon,
  title,
  description,
  href,
  linkLabel,
  cardClass,
}: ProfileEmptyCardProps) {
  return (
    <div className={`${cardClass} flex flex-col items-center gap-5 px-6 py-14 text-center sm:px-10 sm:py-16`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-accent-300">
        {icon}
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-lg font-semibold text-ink-50">{title}</p>
        <p className="max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      </div>
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-medium text-accent-400 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:bg-surface-hover hover:text-accent-300 hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
      >
        {linkLabel}
        <ArrowRight
          size={14}
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
