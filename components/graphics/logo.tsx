import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Show the "AZENION" wordmark next to the mark. Defaults to true. */
  withWordmark?: boolean;
  className?: string;
  markSize?: number;
}

/**
 * Brand logo. The mark itself is the official asset provided by Azenion
 * (public/logo.svg) and must never be recreated, redrawn, or restyled here —
 * only positioned and paired with the wordmark.
 */
export function Logo({ withWordmark = true, className, markSize = 28 }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Azenion — home"
      className={cn(
        "group flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-90",
        className
      )}
    >
      <Image
        src="/logo.svg"
        alt=""
        width={markSize}
        height={markSize}
        priority
        className="shrink-0"
      />
      {withWordmark && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-ink-50">
          AZENION
        </span>
      )}
    </Link>
  );
}
