import { INSTITUTIONS } from "@/data/institutions";

export function Institutions() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="institutions-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <p
          id="institutions-heading"
          className="text-center text-xs font-medium uppercase tracking-[0.16em] text-ink-600"
        >
          Trusted by students at
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 sm:gap-x-16">
          {INSTITUTIONS.map((institution) => (
            <span
              key={institution.name}
              title={institution.fullName ?? institution.name}
              className="text-lg font-semibold tracking-wide text-ink-600 opacity-70 transition-all duration-300 hover:-translate-y-0.5 hover:text-ink-200 hover:opacity-100 sm:text-xl"
            >
              {institution.name}
            </span>
          ))}
          <span className="text-sm font-medium text-accent-400">
            &amp; more coming soon
          </span>
        </div>
      </div>
    </section>
  );
}
