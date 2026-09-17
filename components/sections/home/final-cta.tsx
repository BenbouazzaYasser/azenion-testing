import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/shared/dashboard-button";
import { serverT } from "@/lib/translation/server";

export async function FinalCta() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-32" aria-labelledby="final-cta-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        {/* Open composition — the closing ask earns its weight from type
            scale, not a glowing panel. */}
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="final-cta-heading"
            className="text-balance font-display text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-ink-50 sm:text-[3.25rem] lg:text-[3.75rem]"
          >
            {await serverT("home.finalCtaTitle")}
            {await serverT("home.finalCtaAccent")}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed text-ink-400">
            {await serverT("home.finalCtaSub")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DashboardButton label={await serverT("home.joinNow")} />
            <Button asChild variant="secondary" size="lg">
              <Link href="/teams">
                {await serverT("home.explorePlatform")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
