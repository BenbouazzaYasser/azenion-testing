import { STARFIELD, DUST_TRAIL, type ParticlePoint } from "./infinity-particles";

// Same bezier family as the brand mark (public/logo.svg), scaled 2x and
// centered in an 800x520 canvas — the hero art is literally the logo's
// curve grown to cosmic scale, not a different shape.
export const INFINITY_PATH =
  "M80 260C80 88 272 88 400 260C528 432 720 432 720 260C720 88 528 88 400 260C272 432 80 432 80 260Z";

export type InfinityVariant =
  | "hero"
  | "about"
  | "branches"
  | "teams"
  | "projects"
  | "showcase"
  | "announcements"
  | "contact"
  | "login"
  | "join"
  | "team-detail"
  | "project-detail";

interface InfinityHeroArtProps {
  className?: string;
  /** Disambiguates <defs> ids if this ever renders more than once on a page. */
  idPrefix?: string;
  /** Visual identity variant — each page gets its own atmospheric animation. */
  variant?: InfinityVariant;
}

const variantConfig: Record<InfinityVariant, {
  particleAnim: string;
  glowAnim: string;
}> = {
  hero:       { particleAnim: "animate-drift-slow",        glowAnim: "animate-pulse-glow" },
  about:      { particleAnim: "animate-infinity-about",     glowAnim: "animate-infinity-about-glow" },
  branches:   { particleAnim: "animate-infinity-branches",  glowAnim: "animate-pulse-glow" },
  teams:      { particleAnim: "animate-drift-slow",         glowAnim: "animate-infinity-teams-glow" },
  projects:   { particleAnim: "animate-drift-slow",         glowAnim: "animate-infinity-projects-glow" },
  showcase:   { particleAnim: "animate-drift-slow",         glowAnim: "animate-infinity-showcase-glow" },
  announcements: { particleAnim: "animate-infinity-announcements", glowAnim: "animate-infinity-announcements-glow" },
  contact:    { particleAnim: "animate-drift-slow",         glowAnim: "animate-infinity-contact-glow" },
  login:      { particleAnim: "animate-drift-slow",         glowAnim: "animate-infinity-login-glow" },
  join:       { particleAnim: "animate-infinity-join",      glowAnim: "animate-infinity-login-glow" },
  "team-detail":  { particleAnim: "animate-infinity-team-detail",      glowAnim: "animate-infinity-team-detail-glow" },
  "project-detail": { particleAnim: "animate-drift-slow",   glowAnim: "animate-infinity-project-detail-glow" },
};

function ParticleField({
  points,
  prefix,
}: {
  points: ParticlePoint[];
  prefix: string;
}) {
  return (
    <>
      {points.map(([x, y, r, o, warm], i) => (
        <circle
          key={`${prefix}-${i}`}
          cx={x}
          cy={y}
          r={r}
          fill={warm ? "#FFD9B3" : "#EAF0FF"}
          opacity={o}
          className="origin-center animate-twinkle"
          style={{
            // @ts-expect-error -- custom property read by the twinkle keyframes
            "--tw-twinkle-base": o,
            animationDelay: `${(i % 7) * 0.6}s`,
            animationDuration: `${5 + (i % 5)}s`,
          }}
        />
      ))}
    </>
  );
}

/**
 * The hero's signature visual: a colossal infinity symbol that reads as
 * though gravity pulled cosmic dust into its shape. Pure SVG + CSS —
 * no bitmap, so it stays crisp at any size and costs almost nothing to load.
 *
 * Motion is intentionally slow and ambient (see tailwind.config: drift-slow,
 * pulse-glow, twinkle) and is fully disabled by globals.css when the visitor
 * has prefers-reduced-motion set.
 */
export function InfinityHeroArt({ className, idPrefix = "hero", variant = "hero" }: InfinityHeroArtProps) {
  const cfg = variantConfig[variant];
  const gradId = `${idPrefix}-core-glow`;
  const fadeId = `${idPrefix}-field-fade`;
  const maskId = `${idPrefix}-field-mask`;
  const blurLg = `${idPrefix}-blur-lg`;
  const blurMd = `${idPrefix}-blur-md`;
  const blurSm = `${idPrefix}-blur-sm`;

  return (
    <svg
      viewBox="0 0 800 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="A giant infinity symbol formed from glowing light and cosmic dust"
    >
      <defs>
        <radialGradient
          id={gradId}
          cx={400}
          cy={260}
          r={340}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="16%" stopColor="#C7CCFF" />
          <stop offset="42%" stopColor="#6D6DFF" />
          <stop offset="78%" stopColor="#2828FF" />
          <stop offset="100%" stopColor="#2828FF" stopOpacity={0.35} />
        </radialGradient>

        <radialGradient id={fadeId} cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <mask id={maskId}>
          <rect width={800} height={520} fill={`url(#${fadeId})`} />
        </mask>

        <filter id={blurLg} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={30} />
        </filter>
        <filter id={blurMd} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={14} />
        </filter>
        <filter id={blurSm} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={4} />
        </filter>
      </defs>

      {/* Ambient nebula wash — the "cosmic dust" the symbol emerges from */}
      <ellipse
        cx={250}
        cy={290}
        rx={260}
        ry={170}
        fill="#2828FF"
        opacity={0.07}
        filter={`url(#${blurLg})`}
      />
      <ellipse
        cx={210}
        cy={310}
        rx={130}
        ry={90}
        fill="#FFD9B3"
        opacity={0.035}
        filter={`url(#${blurLg})`}
      />

      {/* Drifting star + dust field, gently fading toward the canvas edges */}
      <g mask={`url(#${maskId})`} className={cfg.particleAnim} style={{ transformOrigin: "400px 260px" }}>
        <ParticleField points={STARFIELD} prefix={`${idPrefix}-star`} />
        <ParticleField points={DUST_TRAIL} prefix={`${idPrefix}-dust`} />
      </g>

      {/* Soft volumetric glow — stacked blurred strokes, back to front */}
      <path
        d={INFINITY_PATH}
        stroke="#2828FF"
        strokeWidth={48}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.12}
        filter={`url(#${blurLg})`}
        className={cfg.glowAnim}
        style={{ animationDelay: "0s" }}
      />
      <path
        d={INFINITY_PATH}
        stroke="#4747FF"
        strokeWidth={26}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.2}
        filter={`url(#${blurMd})`}
        className={cfg.glowAnim}
        style={{ animationDelay: "1.5s" }}
      />

      {/* Crisp core line — this is what reads as "the symbol" */}
      <path
        d={INFINITY_PATH}
        stroke={`url(#${gradId})`}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${blurSm})`}
        className={cfg.glowAnim}
        style={{ animationDelay: "0.8s" }}
      />
      <path
        d={INFINITY_PATH}
        stroke={`url(#${gradId})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
