function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[0.75rem] bg-surface ${className}`} />;
}

export default function TeamsLoading() {
  return (
    <>
      <section className="relative pt-[120px] sm:pt-[136px] lg:pt-[152px]">
        <div className="relative mx-auto max-w-[920px] px-5 pb-16 pt-12 text-center sm:px-8 sm:pt-14 lg:pb-24 lg:pt-16">
          <div className="flex justify-center">
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <Skeleton className="mx-auto mt-6 h-12 w-64 sm:h-14" />
          <div className="mt-8 flex justify-center gap-4">
            <Skeleton className="h-12 w-36 rounded-full" />
          </div>
        </div>
      </section>
      <section className="relative py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
          <Skeleton className="mb-6 h-5 w-28 rounded-full" />
          <Skeleton className="h-10 w-48 sm:h-12" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl card-surface p-6 shadow-card backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
