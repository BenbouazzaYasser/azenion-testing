"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./page-atmosphere.module.css";

interface NodeSpec {
  left: number;
  top: number;
  size: number;
  background: string;
  haloBg: string;
  haloSize: number;
  opacity: number;
  blur: number;
  glow: string | null;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  pulse: boolean;
  pulseDuration: number;
  pulseDelay: number;
}

const NODE_COUNT = 80;

const MIN_NODE_DIST = 5.5;

const REPEL_RADIUS = 300;
const REPEL_MAX = 26;
const REPEL_SMOOTH = 0.05;

const ENERGIZE_RADIUS = 260;
const GLOW_SMOOTH = 0.06;

const COLORS: [number, number, number][] = [
  [40, 40, 255],
  [60, 60, 255],
  [90, 110, 255],
  [109, 109, 255],
  [140, 150, 255],
  [170, 180, 255],
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildNodes(seed: number): NodeSpec[] {
  const rand = mulberry32(seed);
  const nodes: NodeSpec[] = [];
  const placed: { x: number; y: number }[] = [];

  const placePosition = (): { x: number; y: number } => {
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = rand() * 100;
      const y = rand() * 100;
      let farEnough = true;
      for (const p of placed) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_NODE_DIST) {
          farEnough = false;
          break;
        }
      }
      if (farEnough) return { x, y };
    }
    return { x: rand() * 100, y: rand() * 100 };
  };

  for (let i = 0; i < NODE_COUNT; i++) {
    const isLarge = rand() < 0.2;
    const size = isLarge
      ? 10 + Math.round(rand() * 6)
      : 2 + Math.round(rand() * 6);
    const blur = !isLarge && rand() < 0.35 ? 1 + Math.round(rand() * 2) : 0;
    const driftX = Math.round((rand() - 0.5) * 300);
    const driftY = Math.round((rand() - 0.5) * 300);

    const [r, g, b] = COLORS[Math.floor(rand() * COLORS.length)]!;
    const color = `rgb(${r}, ${g}, ${b})`;
    const useGradient = rand() < 0.45;
    const background = useGradient
      ? `radial-gradient(circle at 35% 35%, rgb(${Math.min(r + 70, 255)}, ${Math.min(g + 70, 255)}, ${Math.min(b + 70, 255)}), ${color} 70%)`
      : color;

    const isGlow = rand() < 0.2;
    const glow = isGlow
      ? `0 0 ${12 + Math.round(rand() * 10)}px ${4 + Math.round(rand() * 5)}px rgba(${r}, ${g}, ${b}, 0.3)`
      : null;

    const haloSize = Math.max(28, size * 6);
    const haloBg = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.5) 0%, rgba(${r}, ${g}, ${b}, 0.16) 45%, rgba(${r}, ${g}, ${b}, 0) 72%)`;

    const { x: left, y: top } = placePosition();
    placed.push({ x: left, y: top });

    nodes.push({
      left,
      top,
      size,
      background,
      haloBg,
      haloSize,
      opacity: 0.14 + rand() * 0.46,
      blur,
      glow,
      duration: 20 + Math.round(rand() * 70),
      delay: Math.round(rand() * 90),
      driftX,
      driftY,
      pulse: rand() < 0.4,
      pulseDuration: 4 + Math.round(rand() * 5),
      pulseDelay: Math.round(rand() * 9),
    });
  }

  return nodes;
}

function easeInOutSine(t: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

interface RepelState {
  x: number;
  y: number;
}

export function AtmosphereNodes() {
  const [nodes, setNodes] = useState<NodeSpec[]>(() => buildNodes(0x5eed));

  useEffect(() => {
    setNodes(buildNodes(Math.floor(Math.random() * 2_147_483_647)));
  }, []);

  const layerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const coreRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const haloRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorRef = useRef({ x: -9999, y: -9999 });
  const layerRectRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const repelRef = useRef<RepelState[]>(
    nodes.map(() => ({ x: 0, y: 0 }))
  );
  const glowRef = useRef<number[]>(nodes.map(() => 0));

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const layer = layerRef.current;
    if (!layer) return;

    const measureLayer = () => {
      const rect = layer.getBoundingClientRect();
      layerRectRef.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    measureLayer();

    const handlePointerMove = (event: PointerEvent) => {
      cursorRef.current.x = event.clientX;
      cursorRef.current.y = event.clientY;
    };

    let frame = 0;

    const tick = () => {
      const now = performance.now() / 1000;
      const { left, top, width, height } = layerRectRef.current;
      const cursorX = cursorRef.current.x - left;
      const cursorY = cursorRef.current.y - top;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        const el = nodeRefs.current[i];
        const core = coreRefs.current[i];
        const halo = haloRefs.current[i];
        if (!el || !core || !halo) continue;

        const period = node.duration * 2;
        const q =
          (((now + node.delay) % period) + period) % period / period;
        const r = q < 0.5 ? q * 2 : 2 - q * 2;
        const e = easeInOutSine(r);
        const driftX = node.driftX * e;
        const driftY = node.driftY * e;

        const nodeX = (node.left / 100) * width + driftX;
        const nodeY = (node.top / 100) * height + driftY;

        const dx = nodeX - cursorX;
        const dy = nodeY - cursorY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetX = 0;
        let targetY = 0;

        if (dist < REPEL_RADIUS && dist > 0.001) {
          const falloff = smoothstep(1 - dist / REPEL_RADIUS);
          const sizeFactor = Math.max(0.5, 1 - (node.size - 2) / 14);
          const strength = REPEL_MAX * falloff * sizeFactor;
          targetX = (dx / dist) * strength;
          targetY = (dy / dist) * strength;
        }

        const repel = repelRef.current[i]!;
        repel.x += (targetX - repel.x) * REPEL_SMOOTH;
        repel.y += (targetY - repel.y) * REPEL_SMOOTH;

        el.style.transform = `translate3d(${driftX + repel.x}px, ${driftY + repel.y}px, 0)`;

        const targetGlow =
          dist < ENERGIZE_RADIUS
            ? 1 - dist / ENERGIZE_RADIUS
            : 0;
        const glow = glowRef.current[i]!;
        glowRef.current[i] = glow + (targetGlow - glow) * GLOW_SMOOTH;
        const energy = glowRef.current[i]!;

        const softness = Math.max(0.4, 1 - (node.size - 2) / 14);
        const haloScale = 0.55 + energy * 0.75;
        halo.style.transform = `scale(${haloScale})`;
        halo.style.opacity = String(energy * softness * 0.6);

        core.style.opacity = String(
          Math.min(1, node.opacity * (1 + energy * 0.45))
        );
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("scroll", measureLayer, { passive: true });
    window.addEventListener("resize", measureLayer);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", measureLayer);
      window.removeEventListener("resize", measureLayer);
    };
  }, [nodes]);

  return (
    <div ref={layerRef} aria-hidden className={styles.layer}>
      {nodes.map((node, i) => {
        const anchorStyle = {
          left: `${node.left}%`,
          top: `${node.top}%`,
          width: `${node.size}px`,
          height: `${node.size}px`,
          ["--node-pulse-duration" as string]: `${node.pulseDuration}s`,
          ["--node-pulse-delay" as string]: `-${node.pulseDelay}s`,
          ["--node-opacity" as string]: `${node.opacity}`,
        } as CSSProperties;

        const coreStyle = {
          background: node.background,
          opacity: node.opacity,
          boxShadow: node.glow ?? undefined,
          filter: node.blur > 0 ? `blur(${node.blur}px)` : undefined,
        } as CSSProperties;

        const haloStyle = {
          width: `${node.haloSize}px`,
          height: `${node.haloSize}px`,
          marginLeft: `${-node.haloSize / 2}px`,
          marginTop: `${-node.haloSize / 2}px`,
          background: node.haloBg,
          opacity: 0,
        } as CSSProperties;

        return (
          <span
            key={i}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            className={
              node.pulse ? `${styles.node} ${styles.pulse}` : styles.node
            }
            style={anchorStyle}
          >
            <span
              ref={(el) => {
                coreRefs.current[i] = el;
              }}
              className={styles.core}
              style={coreStyle}
            />
            <span
              ref={(el) => {
                haloRefs.current[i] = el;
              }}
              className={styles.halo}
              style={haloStyle}
            />
          </span>
        );
      })}
    </div>
  );
}