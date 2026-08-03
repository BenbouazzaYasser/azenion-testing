import { CORE_VALUES } from "@/data/about";
import { Reveal } from "@/components/ui/reveal";

export function CoreValues() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="values-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="values-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Our values
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[1.02rem] leading-7 text-ink-400">
            The principles that shape our community and guide every decision.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_VALUES.map((value, i) => {
            const Icon = value.icon;
            return (
              <Reveal key={value.title} delay={i * 60} className="h-full">
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex-1 p-6 sm:p-7">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
                      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <Icon size={17} strokeWidth={1.75} className="relative" />
                    </div>

                    <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-400">
                      {value.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
