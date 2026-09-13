import { serverT } from "@/lib/translation/server";

export async function PageBridge() {
  return (
    <div className="relative h-40 overflow-hidden sm:h-48 lg:h-56" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.04] to-transparent" />

      <div className="absolute left-1/2 top-1/2 h-52 w-[800px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[25%] h-[2px] w-[2px] rounded-full bg-accent-400/40" />
        <div className="absolute left-[75%] top-[35%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[45%] top-[60%] h-[2px] w-[2px] rounded-full bg-accent-400/30" />
        <div className="absolute left-[85%] top-[20%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[25%] top-[70%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[60%] top-[30%] h-[2px] w-[2px] rounded-full bg-accent-400/30" />
        <div className="absolute left-[10%] top-[45%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[90%] top-[65%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="mx-auto flex h-full max-w-[1320px] items-center justify-center px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-px bg-gradient-to-b from-accent-400/40 to-transparent" />
          <span className="animate-pulse text-[11px] font-medium uppercase tracking-[0.18em] text-ink-600">
            {await serverT("home.journeyContinues")}
          </span>
        </div>
      </div>
    </div>
  );
}
