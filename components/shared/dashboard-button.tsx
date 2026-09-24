"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/translation/translation-provider";
import { cn } from "@/lib/utils";

interface DashboardButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
  showArrow?: boolean;
}

export function DashboardButton({
  variant = "primary",
  size = "lg",
  className,
  label,
  showArrow = true,
}: DashboardButtonProps) {
  const { user, loading } = useUser();
  const { t } = useTranslation();

  if (loading) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(className, "cursor-wait opacity-70")}
        disabled
        aria-busy="true"
      >
        {label ?? t("nav.join")}
      </Button>
    );
  }

  if (user) {
    return (
      <Button variant={variant} size={size} className={className} asChild>
        <Link href="/teams">
          {t("nav.joinTeam")}
          {showArrow ? <ArrowUpRight size={16} aria-hidden /> : null}
        </Link>
      </Button>
    );
  }

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href="/join">
        {label ?? t("nav.join")}
        {showArrow ? <ArrowUpRight size={16} aria-hidden /> : null}
      </Link>
    </Button>
  );
}
