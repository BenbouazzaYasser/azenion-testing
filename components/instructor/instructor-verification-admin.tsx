"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AdminVerificationRequest,
  adminReviewInstructorVerification,
} from "@/actions/instructor-verification.actions";

interface Props {
  requests: AdminVerificationRequest[];
  total: number;
  currentPage: number;
  currentStatus?: string;
}

export default function InstructorVerificationAdmin({
  requests,
  total,
  currentPage,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(total / 20);

  const handleReview = async (
    requestId: string,
    action: "approve" | "reject" | "needs_info"
  ) => {
    setLoading(true);
    setError(null);

    const result = await adminReviewInstructorVerification({
      request_id: requestId,
      action,
      review_notes: reviewNotes || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setReviewNotes("");
      setExpandedId(null);
      router.refresh();
    }
  };

  const statusColors = {
    pending: "bg-warning/20 text-warning",
    approved: "bg-success/20 text-success",
    rejected: "bg-danger/20 text-danger",
    needs_info: "bg-info/20 text-info",
  };

  const filters = [
    { label: "All", value: undefined },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Needs Info", value: "needs_info" },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((filter) => {
          const isActive = filter.value === currentStatus || (!filter.value && !currentStatus);
          return (
            <Link
              key={filter.label}
              href={`/admin/instructor-verification${filter.value ? `?status=${filter.value}` : ""}`}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border border-accent/60 bg-accent/20 text-accent"
                  : "border border-ink-700 bg-void-900/30 text-ink-300 hover:bg-void-900/50"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-4">
        <p className="text-ink-300">
          Showing <span className="font-medium text-ink-50">{requests.length}</span> of{" "}
          <span className="font-medium text-ink-50">{total}</span> requests
        </p>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="rounded-lg border border-ink-800 bg-void-900/50 p-8 text-center text-ink-400">
            No verification requests found
          </div>
        ) : (
          requests.map((request) => {
            const isExpanded = expandedId === request.id;

            return (
              <div
                key={request.id}
                className="rounded-lg border border-ink-800 bg-void-900/50 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {request.avatar_url ? (
                      <img
                        src={request.avatar_url}
                        alt={request.username}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-lg font-semibold text-accent">
                        {((request.username ?? "?")[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-ink-50">
                        {request.full_name}
                      </h3>
                      <p className="text-sm text-ink-400">@{request.username}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(request.expertise_areas ?? []).map((area) => (
                          <span
                            key={area}
                            className="inline-flex items-center rounded-full bg-accent/20 px-2 py-1 text-xs text-accent"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[request.status]}`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                    className="rounded-lg border border-ink-700 bg-void-900/30 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-void-900/50"
                  >
                    {isExpanded ? "Hide Details" : "Show Details"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t border-ink-800 pt-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink-200">
                        Review Notes
                      </label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        placeholder="Add notes about your review decision..."
                        className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-accent focus:outline-none dark:border-ink-700 dark:bg-void-800 dark:text-ink-50 dark:focus:border-accent"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(request.id, "approve")}
                        disabled={loading}
                        className="rounded-lg border border-success/40 bg-success/10 px-4 py-2 font-medium text-success hover:bg-success/20 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(request.id, "needs_info")}
                        disabled={loading}
                        className="rounded-lg border border-info/40 bg-info/10 px-4 py-2 font-medium text-info hover:bg-info/20 disabled:opacity-50"
                      >
                        Request Info
                      </button>
                      <button
                        onClick={() => handleReview(request.id, "reject")}
                        disabled={loading}
                        className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 font-medium text-danger hover:bg-danger/20 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {currentPage > 1 && (
            <Link
              href={`/admin/instructor-verification?page=${currentPage - 1}${currentStatus ? `&status=${currentStatus}` : ""}`}
              className="rounded-lg bg-void-800 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-void-700 dark:bg-void-800 dark:text-ink-200 dark:hover:bg-void-700"
            >
              Previous
            </Link>
          )}
          <span className="flex items-center px-4 text-ink-300">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/admin/instructor-verification?page=${currentPage + 1}${currentStatus ? `&status=${currentStatus}` : ""}`}
              className="rounded-lg bg-void-800 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-void-700 dark:bg-void-800 dark:text-ink-200 dark:hover:bg-void-700"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
