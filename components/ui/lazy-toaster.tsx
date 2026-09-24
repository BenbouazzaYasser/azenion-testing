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
          marginBottom: "calc(env(safe-area-inset-bottom, 0px) + var(--space-4))",
        },
        duration: 4000,
      }}
    />
  );
}
