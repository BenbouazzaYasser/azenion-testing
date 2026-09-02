"use client";

import { Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentMenuProps {
  onSelectImages: () => void;
  onSelectFiles: () => void;
  onClose: () => void;
}

export function AttachmentMenu({ onSelectImages, onSelectFiles, onClose }: AttachmentMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Attachment options"
      className="w-56 overflow-hidden rounded-2xl border border-border bg-glass-strong shadow-dropdown backdrop-blur-2xl"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onSelectImages();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-ink-50 hover:bg-surface-hover focus-visible:bg-surface focus-visible:outline-none"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <ImageIcon size={16} />
        </span>
        <span className="flex flex-col items-start">
          <span className="font-medium">Photos & images</span>
          <span className="text-xs text-ink-500">JPG, PNG, WebP, GIF, HEIC</span>
        </span>
      </button>
      <div className="h-px bg-border/50" aria-hidden />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onSelectFiles();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-ink-50 hover:bg-surface-hover focus-visible:bg-surface focus-visible:outline-none"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <FileText size={16} />
        </span>
        <span className="flex flex-col items-start">
          <span className="font-medium">Files & documents</span>
          <span className="text-xs text-ink-500">PDF, DOCX, XLSX, ZIP, TXT</span>
        </span>
      </button>
    </div>
  );
}
