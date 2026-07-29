import { cn } from "@/lib/utils";

export type AmbientPreset = "hero" | "section" | "detail" | "card";

interface AmbientBgProps {
  preset?: AmbientPreset;
  className?: string;
}

const presets: Record<AmbientPreset, {
  radials: string;
  topWash: string;
  bottomFade?: string;
  accentLine?: string;
  centerGlow?: string;
}> = {
  hero: {
    radials:
      "radial-gradient(circle_at_20%_10%,rgba(40,40,255,0.24),transparent_34%)," +
      "radial-gradient(circle_at_80%_20%,rgba(109,109,255,0.16),transparent_36%)," +
      "linear-gradient(180deg,rgba(255,255,255,0.05),transparent_55%)",
    topWash: "h-[70vh] bg-gradient-to-b from-accent/10 via-transparent to-transparent",
    centerGlow:
      "absolute left-1/2 top-0 h-40 w-[700px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(40,40,255,0.12),transparent_70%)]",
    accentLine: "absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent/[0.06] via-accent/[0.02] to-transparent",
  },
  section: {
    radials:
      "radial-gradient(circle_at_30%_20%,rgba(40,40,255,0.20),transparent_40%)," +
      "radial-gradient(circle_at_80%_60%,rgba(109,109,255,0.12),transparent_35%)",
    topWash: "h-[60vh] bg-gradient-to-b from-accent/8 via-transparent to-transparent",
    bottomFade: "absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-void-950 via-void-950/40 to-transparent",
  },
  detail: {
    radials:
      "radial-gradient(circle_at_65%_40%,rgba(40,40,255,0.18),transparent_40%)," +
      "radial-gradient(circle_at_30%_60%,rgba(109,109,255,0.10),transparent_35%)",
    topWash: "h-[40vh] bg-gradient-to-b from-accent/6 via-transparent to-transparent",
  },
  card: {
    radials:
      "radial-gradient(circle_at_50%_30%,rgba(40,40,255,0.18),transparent_50%)",
    topWash: "",
    bottomFade: "absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-accent/8 via-transparent to-transparent",
  },
};

export function AmbientBg({ preset = "hero", className }: AmbientBgProps) {
  const p = presets[preset];

  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      <div className="absolute inset-0" style={{ backgroundImage: p.radials }} />
      {p.topWash && (
        <div className={`absolute inset-x-0 top-0 ${p.topWash}`} />
      )}
      {p.bottomFade && (
        <div className={p.bottomFade} />
      )}
      {preset === "hero" && (
        <>
          <div className={p.accentLine} />
          <div className={p.centerGlow} />
        </>
      )}
    </div>
  );
}
