"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMyEntitlement } from "@/actions/academy-payments.actions";

/**
 * Post-checkout status display. Reads the ?payment= return flag (set by the
 * UX-only return route) and the user's own entitlement. Final confirmation
 * always comes from the verified webhook path — this component only reflects
 * redirect state plus the current entitlement read.
 */
export function CourseEntitlementDisplay({ courseId }: { courseId: string }) {
  const searchParams = useSearchParams();
  const [hasAccess, setHasAccess] = useState(false);

  const payment = searchParams.get("payment");

  useEffect(() => {
    let cancelled = false;
    getMyEntitlement(courseId)
      .then((result) => {
        if (!cancelled) setHasAccess(result.hasAccess);
      })
      .catch(() => {
        if (!cancelled) setHasAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, payment]);

  if (payment === "canceled" || payment === "cancelled") {
    return (
      <p className="text-muted-foreground">
        Purchase canceled. You retain access to any free content.
      </p>
    );
  }

  if (payment === "success" && !hasAccess) {
    return (
      <p className="text-muted-foreground">
        Payment received. Access will be confirmed automatically once the
        payment provider verifies it.
      </p>
    );
  }

  if (hasAccess) {
    return <p className="text-success-500">You have access to this course</p>;
  }

  return null;
}
