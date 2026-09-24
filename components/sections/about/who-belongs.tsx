import { ROLES } from "@/data/about";

export function WhoBelongs() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="belongs-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        
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
        

        <div className="mt-12 grid grid-cols-2 gap-4 min-[420px]:gap-4 sm:grid-cols-4">
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            return (
              <div key={role.title} className="h-full">
                <div className="group relative flex h-full flex-col items-center rounded-2xl card-surface p-4 text-center shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40 sm:p-7">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-surface text-accent-400 transition-all duration-500 ease-premium group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08]">
                    <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <Icon size={22} strokeWidth={1.75} className="relative" />
                  </div>

                  <span className="relative mt-4 text-[0.92rem] font-medium text-ink-200">
                    {role.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        
          <div className="mx-auto mt-12 max-w-2xl text-center">
            <p className="text-[1.15rem] leading-relaxed text-ink-300">
              If you love building meaningful things,{" "}
              you will feel at home.
            </p>
          </div>
        
      </div>
    </section>
  );
}
