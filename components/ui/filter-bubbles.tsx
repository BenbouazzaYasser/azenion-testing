"use client";

interface FilterBubble {
  id: string;
  label: string;
}

interface FilterBubblesProps {
  options: FilterBubble[];
  selected: string | string[];
  onSelect: (id: string) => void;
}

export function FilterBubbles({ options, selected, onSelect }: FilterBubblesProps) {
  const isMulti = Array.isArray(selected);
  const hasSelection = isMulti ? selected.length > 0 : selected !== "";

  const isActive = (id: string) =>
    isMulti ? selected.includes(id) : selected === id;

  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        onClick={() => onSelect(isMulti ? "__clear" : "")}
        className={`min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,box-shadow] duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 ${
          !hasSelection
            ? "border-accent bg-accent text-white shadow-control"
            : "border-border bg-surface/70 text-ink-400 hover:border-accent-400/40 hover:bg-surface-hover hover:text-ink-200"
        }`}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,box-shadow] duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 ${
            isActive(opt.id)
              ? "border-accent bg-accent text-white shadow-control"
              : "border-border bg-surface/70 text-ink-400 hover:border-accent-400/40 hover:bg-surface-hover hover:text-ink-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
