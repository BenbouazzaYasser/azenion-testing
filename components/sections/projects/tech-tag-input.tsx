"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TechTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

const inputBase =
  "rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus-within:border-accent-400/60 focus-within:bg-surface focus-within:shadow-input";

export function TechTagInput({ tags, onChange, disabled }: TechTagInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  return (
    <div
      className={`flex min-h-[56px] flex-wrap items-center gap-2 px-3 py-2 ${inputBase} cursor-text`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-lg border border-accent-400/25 bg-accent/[0.08] px-2.5 py-1 text-sm text-accent-300"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            disabled={disabled}
            className="rounded p-0.5 text-accent-400/60 transition-colors hover:text-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-40"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={tags.length === 0 ? "Type a technology and press Enter..." : "Add more..."}
        className="min-w-[100px] flex-1 bg-transparent text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none"
      />
    </div>
  );
}
