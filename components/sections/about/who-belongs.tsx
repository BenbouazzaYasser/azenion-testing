import { ROLES } from "@/data/about";
import { Reveal } from "@/components/ui/reveal";

export function WhoBelongs() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="belongs-heading">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-1/4 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute right-1/4 top-1/2 h-48 w-48 rounded-full bg-accent-400/8 blur-[110px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[10%] top-[12%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[82%] top-[18%] h-[3px] w-[3px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[18%] top-[78%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[85%] top-[68%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[50%] top-[5%] h-[3px] w-[3px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[92%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[5%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[65%] top-[92%] h-[3px] w-[3px] rounded-full bg-accent-400/15" />
      </div>

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

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            return (
              <Reveal key={role.title} delay={i * 50}>
                <div className="group relative flex flex-col items-center rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-7 text-center shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
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
          <div className="mx-auto mt-16 max-w-2xl text-center">
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
