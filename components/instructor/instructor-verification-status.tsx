"use client";

import { useTranslation } from "@/components/translation/translation-provider";
import type { DictKey } from "@/lib/translation/types";
import { InstructorVerificationRequest } from "@/actions/instructor-verification.actions";

interface Props {
  request: InstructorVerificationRequest;
}

export default function InstructorVerificationStatus({ request }: Props) {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    {
      icon: string;
      titleKey: DictKey;
      descriptionKey: DictKey;
      borderClass: string;
      bgClass: string;
      textClass: string;
    }
  > = {
    pending: {
      icon: "⏳",
      titleKey: "settings.instructorStatusPending",
      descriptionKey: "settings.instructorStatusPendingDescAlt",
      borderClass: "border-warning/20",
      bgClass: "bg-warning/5",
      textClass: "text-warning",
    },
    approved: {
      icon: "✓",
      titleKey: "settings.instructorStatusApproved",
      descriptionKey: "settings.instructorStatusApprovedDescAlt",
      borderClass: "border-success/20",
      bgClass: "bg-success/5",
      textClass: "text-success",
    },
    rejected: {
      icon: "✗",
      titleKey: "settings.instructorStatusRejected",
      descriptionKey: "settings.instructorStatusRejectedDesc",
      borderClass: "border-danger/20",
      bgClass: "bg-danger/5",
      textClass: "text-danger",
    },
    needs_info: {
      icon: "ℹ",
      titleKey: "settings.instructorStatusNeedsInfo",
      descriptionKey: "settings.instructorStatusNeedsInfoDescAlt",
      borderClass: "border-info/20",
      bgClass: "bg-info/5",
      textClass: "text-info",
    },
  };

  const config = (statusConfig[request.status] ?? statusConfig.pending)!;

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border ${config.borderClass} ${config.bgClass} p-6`}>
        <div className="flex items-start gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div className="flex-1">
            <h2 className={`text-lg font-semibold ${config.textClass}`}>
              {t(config.titleKey)}
            </h2>
            <p className="mt-1 text-ink-300">{t(config.descriptionKey)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-ink-50">{t("settings.applicationDetails")}</h3>

        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-ink-400">{t("settings.fullName")}</dt>
            <dd className="mt-1 text-ink-50">{request.full_name}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-ink-400">{t("settings.bio")}</dt>
            <dd className="mt-1 text-ink-50">{request.bio}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-ink-400">{t("settings.instructorExpertise")}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {request.expertise_areas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center rounded-full bg-accent/20 px-3 py-1 text-sm text-accent"
                >
                  {area}
                </span>
              ))}
            </dd>
          </div>

          {request.teaching_experience && (
            <div>
              <dt className="text-sm font-medium text-ink-400">{t("settings.instructorTeaching")}</dt>
              <dd className="mt-1 text-ink-50">{request.teaching_experience}</dd>
            </div>
          )}

          {request.portfolio_url && (
            <div>
              <dt className="text-sm font-medium text-ink-400">{t("settings.portfolio")}</dt>
              <dd className="mt-1">
                <a
                  href={request.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {request.portfolio_url}
                </a>
              </dd>
            </div>
          )}

          {request.linkedin_url && (
            <div>
              <dt className="text-sm font-medium text-ink-400">LinkedIn</dt>
              <dd className="mt-1">
                <a
                  href={request.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {request.linkedin_url}
                </a>
              </dd>
            </div>
          )}

          {request.github_url && (
            <div>
              <dt className="text-sm font-medium text-ink-400">GitHub</dt>
              <dd className="mt-1">
                <a
                  href={request.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {request.github_url}
                </a>
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-ink-400">{t("settings.submitted")}</dt>
            <dd className="mt-1 text-ink-50">
              {new Date(request.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>

          {request.review_notes && (
            <div className="mt-4 rounded-lg border border-ink-700 bg-void-800/50 p-4">
              <dt className="text-sm font-medium text-ink-400">{t("settings.instructorReviewerNotes")}</dt>
              <dd className="mt-2 text-ink-50">{request.review_notes}</dd>
              {request.reviewed_at && (
                <dd className="mt-2 text-sm text-ink-400">
                  {t("settings.reviewedOn")}{" "}
                  {new Date(request.reviewed_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              )}
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
