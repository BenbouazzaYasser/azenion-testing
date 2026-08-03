"use client";

import { useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transferTeamOwnership, transferProjectOwnership } from "@/actions/ownership.actions";

interface MemberInfo {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  role?: string | null;
}

interface TransferOwnershipConfirmModalProps {
  open: boolean;
  onClose: () => void;
  type: "team" | "project";
  resourceName: string;
  targetMember: MemberInfo;
  resourceId: string;
  slug: string;
}

export function TransferOwnershipConfirmModal({
  open,
  onClose,
  type,
  resourceName,
  targetMember,
  resourceId,
  slug,
}: TransferOwnershipConfirmModalProps) {
  const [isPending, startTransition] = useTransition();

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

  if (!open) return null;

  const targetName = targetMember.full_name || targetMember.username || "this member";
  const targetInitials = (targetName || "?").charAt(0).toUpperCase();

  function handleConfirm() {
    const formData = new FormData();
    formData.set(type === "team" ? "team_id" : "project_id", resourceId);
    formData.set("new_owner_id", targetMember.id);
    formData.set("slug", slug);

    startTransition(async () => {
      const action = type === "team" ? transferTeamOwnership : transferProjectOwnership;
      const result = await action(formData);
      if (result.error) {
        alert(result.error);
        return;
      }
      onClose();
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Transfer ownership"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(20,20,28,0.98),rgba(8,8,12,0.98))] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_30px_80px_-20px_rgba(40,40,255,0.15)] backdrop-blur-2xl transition-all duration-200 ease-premium"
      >
        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
            <ShieldAlert size={28} className="text-amber-400" />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-ink-50">Transfer ownership?</h2>
          <div className="mt-4 flex items-center gap-3">
            {targetMember.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={targetMember.avatar_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-accent-400/30 object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-400 text-base font-semibold text-white">
                {targetInitials}
              </span>
            )}
            <p className="min-w-0 text-left">
              <span className="block truncate text-sm font-semibold text-ink-50">{targetName}</span>
              <span className="block text-xs text-ink-500">@{targetMember.username ?? "user"}</span>
            </p>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-400">
            You are about to transfer ownership of{" "}
            <span className="font-medium text-ink-200">{resourceName}</span> to{" "}
            <span className="font-medium text-ink-200">{targetName}</span>.
          </p>
          <p className="mt-2 text-xs text-ink-500">
            This action can be reversed later by the new owner.
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="secondary" onClick={onClose} disabled={isPending} className="sm:flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirm} disabled={isPending} className="sm:flex-1">
              {isPending ? "Transferring..." : "Transfer Ownership"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
