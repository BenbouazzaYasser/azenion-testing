function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[0.75rem] bg-surface ${className}`}
    />
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface p-6 shadow-card backdrop-blur-xl sm:p-8 ${className ?? ""}`}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
        <Skeleton className="h-24 w-24 shrink-0 rounded-full sm:h-28 sm:w-28" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-72" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-16" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[1.5rem] border border-border-strong/[0.08] card-surface px-5 py-5 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:shadow-glow-sm"
        >
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface px-6 py-7 shadow-card backdrop-blur-xl sm:px-8 sm:py-8">
        <Skeleton className="h-4 w-28" />
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-16" />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface px-6 py-7 shadow-card backdrop-blur-xl sm:px-8 sm:py-8">
        <Skeleton className="h-4 w-28" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface px-6 py-8 shadow-card backdrop-blur-xl sm:px-10 sm:py-9">
      <Skeleton className="mb-8 h-5 w-40" />
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 pl-10">
            <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <>
      <CardSkeleton />
      <StatsSkeleton />
      <DetailsSkeleton />
      <TimelineSkeleton />
    </>
  );
}
