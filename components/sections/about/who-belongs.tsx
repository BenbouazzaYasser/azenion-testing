import { ROLES } from "@/data/about";
import { Reveal } from "@/components/ui/reveal";

export function WhoBelongs() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="belongs-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="belongs-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Who belongs here?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[1.02rem] leading-7 text-ink-400">
            Azenion is a home for builders — people who see the world not as
            it is, but as it could be.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            return (
              <Reveal key={role.title} delay={i * 50} className="h-full">
                <div className="group relative flex h-full flex-col items-center rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-7 text-center shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
                    <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <Icon size={22} strokeWidth={1.75} className="relative" />
                  </div>

                  <span className="relative mt-4 text-[0.92rem] font-medium text-ink-200">
                    {role.title}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={500}>
          <div className="mx-auto mt-12 max-w-2xl text-center">
            <p className="text-[1.15rem] leading-relaxed text-ink-300">
              If you love building meaningful things,{" "}
              <span className="text-accent-400">you will feel at home.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
