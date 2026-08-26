import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getMyInstructorVerification,
  amIVerifiedInstructor,
} from "@/actions/instructor-verification.actions";
import InstructorVerificationForm from "@/components/instructor/instructor-verification-form";
import InstructorVerificationStatus from "@/components/instructor/instructor-verification-status";

export const metadata = {
  title: "Become an Instructor",
  description: "Apply to become a verified instructor on Azenion",
};

export default async function InstructorVerificationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if already an instructor
  const { is_instructor } = await amIVerifiedInstructor();

  // Get existing verification request if any
  const { request, error } = await getMyInstructorVerification();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-50">Become an Instructor</h1>
        <p className="mt-2 text-ink-400">
          Apply to become a verified instructor and create courses, labs, and live sessions
        </p>
      </div>

      {is_instructor ? (
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
              <h2 className="text-lg font-semibold text-success">
                You&apos;re a Verified Instructor!
              </h2>
              <p className="mt-1 text-ink-300">
                You can now create courses, labs, and host live sessions. Visit the Academy
                section to get started.
              </p>
            </div>
          </div>
        </div>
      ) : request ? (
        <InstructorVerificationStatus request={request} />
      ) : (
        <InstructorVerificationForm />
      )}
    </div>
  );
}
