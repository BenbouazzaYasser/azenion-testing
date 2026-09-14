import { cn } from "@/lib/utils";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[0.75rem] bg-surface", className)} />;
}

function HeroBlock() {
  return (
    <section className="relative pt-[120px] sm:pt-[136px] lg:pt-[152px]">
      <div className="relative mx-auto max-w-[920px] px-5 pb-16 pt-12 text-center sm:px-8 sm:pt-14 lg:pb-24 lg:pt-16">
        <div className="flex justify-center">
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
        <Skeleton className="mx-auto mt-6 h-12 w-64 sm:h-14" />
        <Skeleton className="mx-auto mt-4 h-4 w-72 max-w-full" />
        <div className="mt-8 flex justify-center gap-4">
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>
    </section>
  );
}

function GridBlock() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Skeleton className="mb-6 h-5 w-28 rounded-full" />
        <Skeleton className="h-10 w-52 sm:h-12" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl card-surface p-6 shadow-card backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="mt-5 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ListPageSkeleton() {
  return (
    <>
      <HeroBlock />
      <GridBlock />
    </>
  );
}

export function GridPageSkeleton() {
  return (
    <section className="relative pb-24 pt-[120px] sm:pt-[136px] lg:pt-[152px]">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-3 h-5 w-80 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 overflow-hidden rounded-2xl card-surface p-4 shadow-card backdrop-blur-xl"
            >
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeedPageSkeleton() {
  return (
    <section className="relative pb-24 pt-32 sm:pb-28 sm:pt-40">
      <div className="relative mx-auto max-w-[720px] px-5 sm:px-8">
        <Skeleton className="h-9 w-52 sm:h-10" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <Skeleton className="mt-8 h-28 rounded-2xl" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl card-surface p-5 shadow-card backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}