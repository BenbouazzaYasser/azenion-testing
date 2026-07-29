import { Reveal } from "@/components/ui/reveal";

export function ComingSoon() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="more-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.12),transparent_70%)]" />

      <div className="pointer-events-none absolute left-1/4 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-1/4 top-1/2 h-56 w-56 rounded-full bg-accent-400/10 blur-[120px]" />

      <div className="mx-auto max-w-[720px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="group mx-auto max-w-[560px] overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-10 text-center shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] sm:p-14">
            <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/10 blur-[80px]" />

            <div className="relative">
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                  <span className="flex h-2 w-2 rounded-full bg-accent-400" />
                  More Coming Soon
                </span>
              </div>

              <h2
                id="more-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
              >
                This Is Only the Beginning
              </h2>

              <p className="mx-auto mt-6 max-w-md text-[1.02rem] leading-8 text-ink-400">
                As Azenion grows, this page will become the central place for
                major announcements, platform milestones, and community news
                that matters.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
