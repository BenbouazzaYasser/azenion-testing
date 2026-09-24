import { InfinityHeroArt } from "./infinity-hero-art";

export function BackgroundAtmosphere() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="animate-drift-slow opacity-40">
          <InfinityHeroArt variant="branches" className="h-[560px] w-[560px] sm:h-[720px] sm:w-[720px]" />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="animate-twinkle pointer-events-none absolute left-[18%] top-[38%] h-1.5 w-1.5 rounded-full bg-white/70"
      />
      <div
        aria-hidden="true"
        style={{ animationDelay: "1.4s" }}
        className="animate-twinkle pointer-events-none absolute bottom-[26%] right-[26%] h-1 w-1 rounded-full bg-white/60"
      />
    </>
  );
}
