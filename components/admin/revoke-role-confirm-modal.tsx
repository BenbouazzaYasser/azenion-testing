"use client";

import { useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminRevokeRole } from "@/actions/admin-roles.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";

interface RevokeRoleConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onRevoked: () => void;
  userId: string;
  username: string | null;
  roleName: string;
}

export function RevokeRoleConfirmModal({
  open,
  onClose,
  onRevoked,
  userId,
  username,
  roleName,
}: RevokeRoleConfirmModalProps) {
  const [isPending, startTransition] = useTransition();
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

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

  function handleConfirm() {
    startTransition(async () => {
      const result = await adminRevokeRole({
        user_id: userId,
        role_name: roleName,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Role "${roleName}" revoked.`);
      onRevoked();
      onClose();
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Revoke role"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
        disabled={isPending}
      />

      <div
        ref={dialogFocusRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-2xl border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
      >
        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <ShieldAlert size={28} className="text-red-400" />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-ink-50">Revoke role?</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-400">
            This removes the{" "}
            <span className="font-medium text-ink-200">{roleName}</span> role from{" "}
            <span className="font-medium text-ink-200">
              @{username ?? "this user"}
            </span>
            . The change takes effect immediately.
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="secondary" onClick={onClose} disabled={isPending} className="sm:flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isPending}
              className="border border-red-500/40 bg-red-500/90 text-white shadow-none hover:bg-red-500 sm:flex-1"
            >
              {isPending ? "Revoking..." : "Revoke Role"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
