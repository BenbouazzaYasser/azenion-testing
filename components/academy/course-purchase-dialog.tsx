"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckout } from "@/actions/academy-payments.actions";

/**
 * Purchase entry point for paid courses. Calls the canonical server-side
 * checkout (price/currency/course-state all validated server-side from DB
 * data) and redirects to the provider's hosted 3DS experience on success.
 * Never handles card data; never decides price client-side.
 */
export function CoursePurchaseDialog({
  courseId,
  priceLabel,
}: {
  courseId: string;
  priceLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handlePurchase = async () => {
    setPending(true);
    try {
      const result = await createCheckout({ courseId });
      if (result.alreadyHasAccess) {
        toast.success("You already have access to this course");
        setOpen(false);
        return;
      }
      if (!result.success || !result.redirectUrl) {
        toast.error(result.error ?? "Payment creation failed");
        return;
      }
      window.location.href = result.redirectUrl;
    } catch {
      toast.error("Payment creation failed");
    } finally {
      setPending(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="h-10 rounded-full px-3 text-xs">
        {priceLabel}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="relative w-full max-w-sm rounded-2xl border navbar-panel-border bg-surface p-6 shadow-dialog backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-50"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="mb-4 text-xl font-bold">Purchase Course</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Price: {priceLabel}. You will be redirected to the secure payment
          page. Access is granted after payment confirmation.
        </p>
        <Button onClick={handlePurchase} disabled={pending} className="w-full">
          {pending ? "Redirecting…" : `Pay ${priceLabel}`}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          By purchasing, you agree to the terms of service.
        </p>
      </div>
    </div>
  );
}
