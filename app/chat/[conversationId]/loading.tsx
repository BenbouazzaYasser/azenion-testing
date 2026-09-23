// Instant skeleton for conversation switches: the layout + sidebar stay
// mounted, so only this pane swaps. Bubbles mimic message-bubble shapes.
const ROWS = [
  "mr-auto w-2/3",
  "ml-auto w-1/2",
  "mr-auto w-3/5",
  "ml-auto w-2/3",
  "mr-auto w-1/2",
  "ml-auto w-3/5",
];

export default function ConversationLoading() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-3.5 w-32 animate-pulse rounded-full bg-surface" />
          <div className="h-2.5 w-20 animate-pulse rounded-full bg-surface/70" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
        {ROWS.map((align, i) => (
          <div key={i} className={`flex flex-col gap-1.5 ${align}`}>
            <div className="h-12 animate-pulse rounded-2xl bg-surface/70" />
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
        <div className="h-11 flex-1 animate-pulse rounded-xl bg-surface/70" />
        <div className="h-11 w-11 animate-pulse rounded-xl bg-surface/70" />
      </div>
    </div>
  );
}
