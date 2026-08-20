import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ProfileSubpageHeaderProps {
  title: string;
  description: string;
}

export function ProfileSubpageHeader({ title, description }: ProfileSubpageHeaderProps) {
  return (
    <div>
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft size={14} />
        Back to profile
      </Link>
      <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-ink-50 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-ink-400">{description}</p>
    </div>
  );
}
