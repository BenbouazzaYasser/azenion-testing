"use client";

import dynamic from "next/dynamic";

// Deferred: sonner renders nothing until a toast fires, so keep it out of
// the initial client bundle and hydrate it after first paint.
const SonnerToaster = dynamic(
  () => import("sonner").then((mod) => ({ default: mod.Toaster })),
  { ssr: false },
);

export function LazyToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      className="!z-[9999]"
      toastOptions={{
        style: {
          background: "rgba(14,16,22,0.92)",
          border: "1px solid rgba(244,245,248,0.14)",
          color: "#F4F5F8",
          backdropFilter: "blur(20px)",
        },
        duration: 4000,
      }}
    />
  );
}
