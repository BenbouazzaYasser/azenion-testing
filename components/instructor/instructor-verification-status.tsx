"use client";

import { InstructorVerificationRequest } from "@/actions/instructor-verification.actions";

interface Props {
  request: InstructorVerificationRequest;
}

export default function InstructorVerificationStatus({ request }: Props) {
  const statusConfig = {
    pending: {
      icon: "⏳",
      title: "Application Under Review",
      description: "Your application is being reviewed by our team. We'll notify you soon!",
      borderClass: "border-warning/20",
      bgClass: "bg-warning/5",
      textClass: "text-warning",
    },
    approved: {
      icon: "✓",
      title: "Application Approved!",
      description: "Congratulations! You're now a verified instructor.",
      borderClass: "border-success/20",
      bgClass: "bg-success/5",
      textClass: "text-success",
    },
    rejected: {
      icon: "✗",
      title: "Application Not Approved",
      description: "Your application was not approved at this time.",
      borderClass: "border-danger/20",
      bgClass: "bg-danger/5",
      textClass: "text-danger",
    },
    needs_info: {
      icon: "ℹ",
      title: "Additional Information Needed",
      description: "Please review the feedback below and resubmit your application.",
      borderClass: "border-info/20",
      bgClass: "bg-info/5",
      textClass: "text-info",
    },
  };

  const config = statusConfig[request.status];

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border ${config.borderClass} ${config.bgClass} p-6`}>
        <div className="flex items-start gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div className="flex-1">
            <h2 className={`text-lg font-semibold ${config.textClass}`}>
              {config.title}
            </h2>
            <p className="mt-1 text-ink-300">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-ink-50">Application Details</h3>

        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-ink-400">Full Name</dt>
            <dd className="mt-1 text-ink-50">{request.full_name}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-ink-400">Bio</dt>
            <dd className="mt-1 text-ink-50">{request.bio}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-ink-400">Expertise Areas</dt>
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
              <dt className="text-sm font-medium text-ink-400">Teaching Experience</dt>
              <dd className="mt-1 text-ink-50">{request.teaching_experience}</dd>
            </div>
          )}

          {request.portfolio_url && (
            <div>
              <dt className="text-sm font-medium text-ink-400">Portfolio</dt>
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
            <dt className="text-sm font-medium text-ink-400">Submitted</dt>
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
              <dt className="text-sm font-medium text-ink-400">Reviewer Notes</dt>
              <dd className="mt-2 text-ink-50">{request.review_notes}</dd>
              {request.reviewed_at && (
                <dd className="mt-2 text-sm text-ink-400">
                  Reviewed on{" "}
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
