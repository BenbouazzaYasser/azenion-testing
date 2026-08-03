import { FlaskConical } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const CORNERS = [
  "left-4 top-4 border-l border-t",
  "right-4 top-4 border-r border-t",
  "left-4 bottom-4 border-l border-b",
  "right-4 bottom-4 border-r border-b",
];

export function LabsBlueprint() {
  return (
    <section
      className="relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="labs-blueprint-heading"
    >
      <div className="mx-auto max-w-[880px] px-5 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] shadow-card backdrop-blur-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(109,109,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(109,109,255,0.07)_1px,transparent_1px)] bg-[size:36px_36px]"
            />
            {CORNERS.map((c) => (
              <div
                key={c}
                aria-hidden
                className={`pointer-events-none absolute h-5 w-5 ${c} border-accent-400/30`}
              />
            ))}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
            />

            <div className="relative flex flex-col items-center px-8 py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                <FlaskConical size={32} />
              </div>
              <h2
                id="labs-blueprint-heading"
                className="mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl"
              >
                Blueprints on the drawing board.
              </h2>
              <p className="mt-4 max-w-lg text-balance text-[0.95rem] leading-relaxed text-ink-400">
                We are designing the space where members build together. When
                Labs launches, projects, research and hackathons will live here.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
