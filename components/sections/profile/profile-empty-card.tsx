import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ProfileEmptyCardProps {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  cardClass: string;
}

export function ProfileEmptyCard({
  title,
  description,
  href,
  linkLabel,
  cardClass,
}: ProfileEmptyCardProps) {
  return (
    <div className={`${cardClass} flex flex-col items-center gap-4 py-10 text-center`}>
      <p className="text-base font-medium text-ink-200">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent-400 transition-colors hover:text-accent-300"
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
