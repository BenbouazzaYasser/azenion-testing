"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OwnershipLeaveModalProps {
  open: boolean;
  onClose: () => void;
  type: "team" | "project";
  onGoToSettings?: () => void;
}

export function OwnershipLeaveModal({ open, onClose, type, onGoToSettings }: OwnershipLeaveModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const title = type === "team" ? "You own this team" : "You own this project";
  const body =
    type === "team"
      ? "You can't leave a team while you're its owner. Transfer ownership to another member, or delete the team first."
      : "You can't leave a project while you're its owner. Transfer ownership to another member, or delete the project first.";
  const buttonLabel = type === "team" ? "Go to Team Settings" : "Go to Project Settings";

  function handleGoToSettings() {
    onClose();
    onGoToSettings?.();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(20,20,28,0.98),rgba(8,8,12,0.98))] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_30px_80px_-20px_rgba(40,40,255,0.15)] backdrop-blur-2xl transition-all duration-200 ease-premium"
      >
        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <ShieldAlert size={28} className="text-red-400" />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-ink-50">{title}</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-400">{body}</p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="secondary" onClick={onClose} className="sm:flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGoToSettings} className="sm:flex-1">
              {buttonLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
