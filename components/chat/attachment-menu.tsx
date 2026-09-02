"use client";

import { Image as ImageIcon, FileText, Film, Sticker as StickerIcon } from "lucide-react";

interface AttachmentMenuProps {
  onSelectImages: () => void;
  onSelectFiles: () => void;
  onSelectGif: () => void;
  onSelectSticker: () => void;
  onClose: () => void;
}

export function AttachmentMenu({ onSelectImages, onSelectFiles, onSelectGif, onSelectSticker, onClose }: AttachmentMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Attachment options"
      className="flex items-center gap-1.5"
    >
      <button
        type="button"
        role="menuitem"
        aria-label="Photos and images"
        title="Photos & images"
        onClick={() => {
          onSelectImages();
          onClose();
        }}
        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-600 shadow-sm ring-1 ring-border hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <ImageIcon size={16} />
      </button>
      <button
        type="button"
        role="menuitem"
        aria-label="Files and documents"
        title="Files & documents"
        onClick={() => {
          onSelectFiles();
          onClose();
        }}
        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-600 shadow-sm ring-1 ring-border hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <FileText size={16} />
      </button>
      <button
        type="button"
        role="menuitem"
        aria-label="GIF"
        title="GIF"
        onClick={() => {
          onSelectGif();
          onClose();
        }}
        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-600 shadow-sm ring-1 ring-border hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <Film size={16} />
      </button>
      <button
        type="button"
        role="menuitem"
        aria-label="Stickers"
        title="Stickers"
        onClick={() => {
          onSelectSticker();
          onClose();
        }}
        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-600 shadow-sm ring-1 ring-border hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <StickerIcon size={16} />
      </button>
    </div>
  );
}
