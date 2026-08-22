/* Page-level atmosphere for the platform.
   ONE continuous light source behind every section of a page.
   Mounted once per page; transparent sections float on top.

   Lives behind the content:
   - layered blue luminance + soft accent glows (depth/richness)
   - extremely faint drifting energy currents
   - cursor-reactive azure nodes

   GPU accelerated: drifts transform opacity only; nodes react to the
   pointer via a single requestAnimationFrame loop with NO React re-render,
   and everything respects prefers-reduced-motion. */

import { type CSSProperties } from "react";

import styles from "./page-atmosphere.module.css";

interface PageAtmosphereProps {
  className?: string;
}

const CURRENTS = [
  {
    style: {
      width: "120%",
      height: "340px",
      left: "-10%",
      top: "16%",
      background:
        "linear-gradient(90deg, transparent, rgba(90, 110, 255, 0.09), rgba(40, 40, 255, 0.11), transparent)",
    } as CSSProperties,
    theme: styles.currentA,
  },
  {
    style: {
      width: "115%",
      height: "300px",
      left: "-8%",
      top: "52%",
      background:
        "linear-gradient(270deg, transparent, rgba(109, 109, 255, 0.07), rgba(60, 60, 255, 0.09), transparent)",
    } as CSSProperties,
    theme: styles.currentB,
  },
  {
    style: {
      width: "125%",
      height: "360px",
      left: "-12%",
      top: "82%",
      background:
        "linear-gradient(90deg, transparent, rgba(170, 180, 255, 0.07), rgba(90, 110, 255, 0.08), transparent)",
    } as CSSProperties,
    theme: styles.currentC,
  },
];

export function PageAtmosphere({ className }: PageAtmosphereProps) {
  return (
    <div
      aria-hidden
      className={className ?? "pointer-events-none absolute inset-0"}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 1000px 600px at 20% 0%, rgba(40, 40, 255, 0.1), transparent 60%), radial-gradient(ellipse 800px 600px at 85% 25%, rgba(109, 109, 255, 0.08), transparent 55%), radial-gradient(ellipse 900px 700px at 50% 100%, rgba(90, 110, 255, 0.08), transparent 60%)",
        }}
      />

      <div className="absolute left-[20%] top-[10%] h-80 w-80 rounded-full bg-accent/10 blur-[140px]" />
      <div className="absolute right-[12%] top-[32%] h-72 w-72 rounded-full bg-accent-400/10 blur-[120px]" />
      <div className="absolute left-[15%] top-[55%] h-80 w-80 rounded-full bg-accent/10 blur-[140px]" />
      <div className="absolute right-[18%] top-[78%] h-72 w-72 rounded-full bg-accent-400/10 blur-[120px]" />
      <div className="absolute left-[45%] top-[40%] h-96 w-96 rounded-full bg-accent-400/[0.06] blur-[160px]" />
      <div className="absolute left-[5%] top-[88%] h-72 w-72 rounded-full bg-accent/10 blur-[120px]" />

      {CURRENTS.map((current, i) => (
        <div
          key={i}
          className={`${styles.current} ${current.theme}`}
          style={current.style}
        />
      ))}


    </div>
  );
}