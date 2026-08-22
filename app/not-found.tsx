import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export default function NotFound() {
  return (
    <>
      <main id="main" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-md px-5 text-center">
          <div className="mb-6">
            <Logo withWordmark={true} markSize={48} className="mx-auto" />
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            Page not found
          </h1>
          <p className="mb-8 text-base leading-relaxed text-ink-400">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved
            or doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border-strong/[0.08] bg-surface px-5 py-3 text-sm font-medium text-ink-200 transition-all duration-200 hover:border-accent-400/40 hover:bg-accent/[0.08] hover:text-accent-200 hover:shadow-[0_0_20px_-5px_rgba(40,40,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
          >
            <ArrowLeft size={16} />
            Back home
          </Link>
        </div>
      </main>
    </>
  );
}