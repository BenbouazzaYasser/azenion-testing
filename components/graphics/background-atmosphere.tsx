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
        className="animate-pulse-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(40,40,255)]/20 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="animate-float-y pointer-events-none absolute right-[14%] top-[24%] h-2 w-2 rounded-full bg-[rgb(40,40,255)] shadow-[0_0_20px_6px_rgba(40,40,255,0.5)]"
      />
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
