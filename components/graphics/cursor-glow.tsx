"use client";

import { useEffect, useRef } from "react";

const EASE = 0.12;
const RADIUS = 360;

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: -9999, y: -9999 });
  const currentRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    const applyBlend = () => {
      const theme = document.documentElement.dataset.theme ?? "dark";
      glow.style.mixBlendMode = theme === "light" ? "multiply" : "screen";
    };

    applyBlend();
    const observer = new MutationObserver(applyBlend);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const glow = glowRef.current;
    if (!glow) return;

    const tick = () => {
      const { x, y } = currentRef.current;
      const { x: tx, y: ty } = targetRef.current;

      const nextX = x + (tx - x) * EASE;
      const nextY = y + (ty - y) * EASE;

      currentRef.current = { x: nextX, y: nextY };

      glow.style.setProperty("--cursor-x", `${nextX}px`);
      glow.style.setProperty("--cursor-y", `${nextY}px`);

      if (Math.abs(tx - nextX) > 0.5 || Math.abs(ty - nextY) > 0.5) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetRef.current.x = event.clientX;
      targetRef.current.y = event.clientY;
      if (frameRef.current === null) {
        glow.style.opacity = "1";
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    const handlePointerLeave = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      glow.style.opacity = "0";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        handlePointerLeave
      );
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="pointer-events-none fixed z-[80] h-[360px] w-[360px] rounded-full opacity-0 transition-opacity duration-700 will-change-transform"
      style={{
        left: 0,
        top: 0,
        background:
          "radial-gradient(circle at center, rgba(40, 40, 255, 0.24) 0%, rgba(40, 40, 255, 0.12) 40%, rgba(40, 40, 255, 0) 70%)",
        transform:
          "translate(var(--cursor-x, -9999px), var(--cursor-y, -9999px)) translate(-50%, -50%)",
        width: `${RADIUS}px`,
        height: `${RADIUS}px`,
      }}
    />
  );
}
