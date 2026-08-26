"use client";

import { useEffect, useState } from "react";
import {
  getMyInstructorVerification,
  amIVerifiedInstructor,
  submitInstructorVerification,
} from "@/actions/instructor-verification.actions";
import type { InstructorVerificationRequest } from "@/actions/instructor-verification.actions";
import { useRouter } from "next/navigation";

export function InstructorSection() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [request, setRequest] = useState<InstructorVerificationRequest | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    expertise_areas: [] as string[],
    teaching_experience: "",
    portfolio_url: "",
    linkedin_url: "",
    github_url: "",
  });
  const [expertiseInput, setExpertiseInput] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [instructorResult, verificationResult] = await Promise.all([
        amIVerifiedInstructor(),
        getMyInstructorVerification(),
      ]);

      setIsInstructor(instructorResult.is_instructor);
      if (!verificationResult.error) {
        setRequest(verificationResult.request);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleAddExpertise = () => {
    if (expertiseInput.trim() && !formData.expertise_areas.includes(expertiseInput.trim())) {
      setFormData({
        ...formData,
        expertise_areas: [...formData.expertise_areas, expertiseInput.trim()],
      });
      setExpertiseInput("");
    }
  };

  const handleRemoveExpertise = (area: string) => {
    setFormData({
      ...formData,
      expertise_areas: formData.expertise_areas.filter((a) => a !== area),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await submitInstructorVerification({
      full_name: formData.full_name,
      bio: formData.bio,
      expertise_areas: formData.expertise_areas,
      teaching_experience: formData.teaching_experience || null,
      portfolio_url: formData.portfolio_url || null,
      linkedin_url: formData.linkedin_url || null,
      github_url: formData.github_url || null,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.refresh();
      // Reload data
      const verificationResult = await getMyInstructorVerification();
      if (!verificationResult.error) {
        setRequest(verificationResult.request);
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
      </div>
    );
  }

  // Show success if already an instructor
  if (isInstructor) {
    return (
      <div className="rounded-lg border border-success/20 bg-success/5 p-6">
        <div className="flex items-start gap-3">
          <svg
            className="h-6 w-6 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-success">You&apos;re a Verified Instructor!</h3>
            <p className="mt-1 text-sm text-ink-300">
              You can now create courses, labs, and host live sessions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show existing request status
  if (request) {
    const statusConfig = {
      pending: {
        icon: "⏳",
        title: "Application Under Review",
        description: "Your application is being reviewed by our team.",
        borderClass: "border-warning/20",
        bgClass: "bg-warning/5",
        textClass: "text-warning",
      },
      approved: {
        icon: "✓",
        title: "Application Approved!",
        description: "Your instructor role will be activated shortly.",
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
        description: "Please review the feedback and consider resubmitting.",
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
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${config.textClass}`}>{config.title}</h3>
              <p className="mt-1 text-sm text-ink-400">{config.description}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-ink-800 pt-6">
            <div>
              <dt className="text-xs font-medium uppercase text-ink-500">Full Name</dt>
              <dd className="mt-1 text-ink-50">{request.full_name}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase text-ink-500">Expertise Areas</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {request.expertise_areas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center rounded-full bg-accent/20 px-2 py-1 text-xs text-accent"
                  >
                    {area}
                  </span>
                ))}
              </dd>
            </div>

            {request.review_notes && (
              <div className="mt-4 rounded-lg border border-ink-700 bg-void-800/50 p-4">
                <dt className="text-xs font-medium uppercase text-ink-500">Reviewer Notes</dt>
                <dd className="mt-2 text-sm text-ink-300">{request.review_notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    );
  }

  // Show application form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-ink-50">Basic Information</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-ink-200">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-2 block text-sm font-medium text-ink-200">
              Bio *
            </label>
            <textarea
              id="bio"
              required
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself and your teaching philosophy..."
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-200">
              Expertise Areas * (at least 1)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExpertise();
                  }
                }}
                placeholder="e.g., JavaScript, React, System Design"
                className="flex-1 rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddExpertise}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-500"
              >
                Add
              </button>
            </div>
            {formData.expertise_areas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.expertise_areas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => handleRemoveExpertise(area)}
                      className="hover:text-accent/70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="teaching_experience"
              className="mb-2 block text-sm font-medium text-ink-200"
            >
              Teaching Experience (optional)
            </label>
            <textarea
              id="teaching_experience"
              rows={3}
              value={formData.teaching_experience}
              onChange={(e) => setFormData({ ...formData, teaching_experience: e.target.value })}
              placeholder="Describe your teaching background..."
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-ink-50">Links (Optional)</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="portfolio_url" className="mb-2 block text-sm font-medium text-ink-200">
              Portfolio URL
            </label>
            <input
              id="portfolio_url"
              type="url"
              value={formData.portfolio_url}
              onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
              placeholder="https://yourportfolio.com"
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="linkedin_url" className="mb-2 block text-sm font-medium text-ink-200">
              LinkedIn URL
            </label>
            <input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/yourprofile"
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="github_url" className="mb-2 block text-sm font-medium text-ink-200">
              GitHub URL
            </label>
            <input
              id="github_url"
              type="url"
              value={formData.github_url}
              onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
              placeholder="https://github.com/yourusername"
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || formData.expertise_areas.length === 0}
        className="w-full rounded-lg bg-accent px-6 py-3 font-medium text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}
