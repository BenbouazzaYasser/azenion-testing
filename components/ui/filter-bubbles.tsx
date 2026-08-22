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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(isMulti ? "__clear" : "")}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 ${
          !hasSelection
            ? "bg-accent text-white"
            : " text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
        }`}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 ${
            isActive(opt.id)
              ? "bg-accent text-white"
              : " text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
