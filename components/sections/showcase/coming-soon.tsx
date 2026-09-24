
export function ComingSoon() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="coming-soon-heading">
      <div className="mx-auto max-w-[720px] px-5 sm:px-8 lg:px-12">
        
          <div className="group mx-auto max-w-[600px] overflow-hidden rounded-2xl card-surface p-10 text-center shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40 sm:p-14">
            <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg border border-border-strong bg-surface">
                <svg viewBox="0 0 512 512" className="h-12 w-12" aria-hidden="true">
                  <path
                    d="M96 256C96 170 192 170 256 256C320 342 416 342 416 256C416 170 320 170 256 256C192 342 96 342 96 256Z"
                    fill="none"
                    stroke="rgb(var(--accent-primary))"
                    strokeWidth="32"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className=""
                  />
                </svg>
              </div>

              <div className="mt-6 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-4 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
                  <span className="flex h-2 w-2 rounded-full bg-accent-400" />
                  Coming Soon
                </span>
              </div>

              <h2
                id="coming-soon-heading"
                className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.8rem]"
              >
                Our Story Is Just Beginning
              </h2>

              <p className="mx-auto mt-6 max-w-lg text-[1.02rem] leading-8 text-ink-400">
                Azenion has only recently begun its journey. The showcase will
                soon celebrate everything this community creates together —
                every project, every team, every milestone.
              </p>
            </div>
          </div>
        
      </div>
    </section>
  );
}
