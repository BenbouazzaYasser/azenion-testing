import { Reveal } from "@/components/ui/reveal";

export function SecurityNote() {
  return (
    <section className="relative pb-20 sm:pb-24 lg:pb-28" aria-label="Security note">
      <div className="mx-auto max-w-[440px] px-5 sm:px-8">
        <Reveal delay={100}>
          <p className="text-center text-xs leading-relaxed text-ink-600">
            Authentication is secured and powered by Supabase.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
