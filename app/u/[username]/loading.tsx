function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[0.75rem] bg-surface ${className}`} />;
}

export default function PublicProfileLoading() {
  return (
    <>
      <div className="overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface p-6 shadow-card backdrop-blur-xl sm:p-8">
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
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface px-6 py-6 shadow-card backdrop-blur-xl sm:px-8 sm:py-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
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
    </>
  );
}