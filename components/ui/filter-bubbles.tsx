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
  console.log("[DEBUG] FilterBubbles items:", options);
  const isMulti = Array.isArray(selected);
  const hasSelection = isMulti ? selected.length > 0 : selected !== "";

  const isActive = (id: string) =>
    isMulti ? selected.includes(id) : selected === id;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(isMulti ? "__clear" : "")}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          !hasSelection
            ? "bg-accent text-white"
            : "border border-border-strong text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
        }`}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            isActive(opt.id)
              ? "bg-accent text-white"
              : "border border-border-strong text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
