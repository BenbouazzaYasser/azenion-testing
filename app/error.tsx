"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";
import { Logo } from "@/components/graphics/logo";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <>
      <main id="main" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-md px-5 text-center">
          <div className="mb-6">
            <Logo withWordmark={true} markSize={48} className="mx-auto" />
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            Something went wrong
          </h1>
          <p className="mb-8 text-base leading-relaxed text-ink-400">
            We encountered an unexpected error. Please try again or go back to the homepage.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={reset}
              className="w-full sm:w-auto"
              size="lg"
            >
              <RefreshCw size={16} className="mr-2" />
              Try again
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-5 py-3 text-sm font-medium text-ink-200 transition-all duration-200 hover:border-accent-400/40 hover:bg-accent/[0.08] hover:text-accent-200 hover:shadow-[0_0_20px_-5px_rgba(40,40,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
            >
              <Home size={16} />
              Back home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}