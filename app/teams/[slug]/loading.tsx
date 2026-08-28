function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[0.75rem] bg-surface ${className}`} />;
}

export default function TeamDetailLoading() {
  return (
    <>
      <section className="relative pt-[88px] sm:pt-[104px] lg:pt-[120px]">
        <div className="relative mx-auto max-w-[920px] px-5 pb-28 pt-16 text-center sm:px-8 sm:pt-20 lg:pb-36 lg:pt-24">
          <div className="flex justify-center">
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="mx-auto mt-6 h-12 w-72 sm:h-14 lg:h-16" />
          <Skeleton className="mx-auto mt-6 h-5 w-96 max-w-full" />
          <div className="mt-6 flex justify-center gap-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <Skeleton className="h-12 w-36 rounded-full" />
            <Skeleton className="h-12 w-36 rounded-full" />
          </div>
        </div>
      </section>
      <section className="relative py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
          <Skeleton className="mb-6 h-7 w-40" />
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
