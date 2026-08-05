import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { Reveal } from "@/components/ui/reveal";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Community | Azenion — The Limitless Network",
  description:
    "The Azenion Community — connect with builders across the Limitless Network through feeds, showcases, and announcements.",
};

export default function CommunityPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="community-heading">
          <div className="mx-auto max-w-[720px] px-5 sm:px-8 lg:px-12">
            <Reveal>
              <div className="mx-auto max-w-[600px] overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-10 text-center shadow-card backdrop-blur-xl sm:p-14">
                <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/10 blur-[80px]" />

                <div className="relative">
                  <div className="mt-6 flex justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                      <span className="flex h-2 w-2 rounded-full bg-accent-400" />
                      Coming Soon
                    </span>
                  </div>

                  <h2
                    id="community-heading"
                    className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.8rem]"
                  >
                    The Community Hub Is Being Built
                  </h2>

                  <p className="mx-auto mt-6 max-w-lg text-[1.02rem] leading-8 text-ink-400">
                    This will be the home of the Azenion community. Until then,
                    explore the feed, showcase, and announcements from the
                    Community menu.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
