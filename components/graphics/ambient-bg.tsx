export type AmbientPreset = "hero" | "section" | "detail" | "card";

interface AmbientBgProps {
  preset?: AmbientPreset;
  className?: string;
}

export function AmbientBg({ preset = "hero", className }: AmbientBgProps) {
  void preset;
  void className;
  // No glow washes: depth comes from solid surfaces and hairlines.
  return null;
}
