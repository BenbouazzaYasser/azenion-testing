import { Reveal } from "@/components/ui/reveal";

export function SecurityNote() {
  return (
    <section className="relative pb-24 sm:pb-28 lg:pb-32" aria-label="Security note">
      <div className="mx-auto max-w-[440px] px-5 sm:px-8">
        <Reveal delay={100}>
          <p className="text-center text-xs leading-relaxed text-ink-600">
            Authentication will soon be powered securely by Supabase.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
