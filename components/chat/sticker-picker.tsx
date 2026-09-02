"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { STICKER_PACKS, type Sticker } from "@/lib/stickers/catalog";

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const [activePack, setActivePack] = useState<string>(STICKER_PACKS[0]?.id ?? "classic");

  const pack = STICKER_PACKS.find((p) => p.id === activePack) ?? STICKER_PACKS[0];

  return (
    <div
      role="dialog"
      aria-label="Sticker picker"
      className="flex max-h-[380px] w-[320px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-glass-strong shadow-dropdown backdrop-blur-2xl sm:w-[360px]"
    >
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/30 p-2">
        {STICKER_PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePack(p.id)}
            aria-label={p.name}
            aria-pressed={activePack === p.id}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors",
              activePack === p.id
                ? "bg-accent text-white"
                : "bg-surface hover:bg-surface-hover text-ink-600",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumbnail} alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-[11px] font-medium leading-none">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!pack ? (
          <p className="py-6 text-center text-sm text-ink-500">No stickers</p>
        ) : pack.stickers.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">No stickers in this pack</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {pack.stickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => onSelect(sticker)}
                className="group flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                aria-label={sticker.name}
                title={sticker.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="h-16 w-16 object-contain transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <span className="truncate text-[10px] text-ink-500">{sticker.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/30 px-3 py-1.5 text-center text-[10px] uppercase tracking-widest text-ink-500">
        Azenion Stickers
      </div>
    </div>
  );
}
