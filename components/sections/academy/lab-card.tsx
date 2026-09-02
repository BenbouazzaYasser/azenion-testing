"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Clock, Trash2, ArrowUpRight, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/translation/translation-provider";
import { deleteLab } from "@/actions/academy-labs.actions";
import type { LabRow } from "@/lib/validations/lab.schema";
import { labTypeMeta, difficultyClass } from "./lab-type-meta";
import { LabEditDialog } from "./lab-edit-dialog";

interface LabCardProps {
  lab: LabRow;
  canManage: boolean;
  availableCourses?: { id: string; title: string }[];
}

export function LabCard({ lab, canManage, availableCourses = [] }: LabCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const meta = labTypeMeta(lab.type);
  const Icon = meta.icon;

  // A destructive action shouldn't stay silently "armed" forever if the
  // user clicks once and walks away -- auto-disarm after a few seconds.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", lab.id);
      const result = await deleteLab(fd);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success(t("academy.labDeleted"));
      router.refresh();
    });
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl card-surface-soft shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-gradient-to-b blur-[100px] transition-opacity duration-300 group-hover:opacity-100",
          meta.ringClass,
        )}
      />

      <div className="relative flex flex-1 flex-col p-6">
        {lab.thumbnail_url ? (
          <div className="relative -mx-6 -mt-6 mb-5 overflow-hidden border-b border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lab.thumbnail_url}
              alt={`${lab.title} thumbnail`}
              className="h-40 w-full object-cover"
            />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", meta.iconClass)}>
            <Icon size={20} />
          </span>
          <div className="flex items-center gap-2">
            {!lab.is_published ? (
              <span
                title={t("academy.notPublished")}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong text-ink-500"
              >
                <EyeOff size={13} />
              </span>
            ) : null}
            {canManage ? <LabEditDialog lab={lab} availableCourses={availableCourses} /> : null}
          </div>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-ink-50">{lab.title}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-400">
            {meta.label}
          </span>
          {lab.estimated_duration_minutes ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-400">
              <Clock size={11} />
              {lab.estimated_duration_minutes} {t("academy.minuteShort")}
            </span>
          ) : null}
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize", difficultyClass(lab.difficulty))}>
            {lab.difficulty}
          </span>
        </div>

        {lab.description ? (
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-400">{lab.description}</p>
        ) : (
          <div className="flex-1" />
        )}

        {lab.tags && lab.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lab.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-ink-500">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="rounded-full border border-accent/25 bg-accent/[0.06] px-2.5 py-1 text-xs font-medium text-accent-300">
            {lab.category}
          </span>

          <div className="flex items-center gap-2">
            {canManage ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                aria-label={t("academy.deleteLabAria")}
                title={confirming ? t("academy.clickAgain") : t("academy.deleteLabAria")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                  confirming
                    ? "border-red-500/50 bg-red-500/10 text-red-300"
                    : "border-border-strong text-ink-400 hover:border-red-500/50 hover:text-red-300",
                )}
              >
                <Trash2 size={13} />
              </button>
            ) : null}
            <Link
              href={`/academy/labs/${lab.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-medium text-white transition-all duration-300 ease-premium hover:bg-accent-glow hover:shadow-glow"
            >
              {t("academy.open")}
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
