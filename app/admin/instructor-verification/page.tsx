import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminGetVerificationRequests } from "@/actions/instructor-verification.actions";
import InstructorVerificationAdmin from "@/components/instructor/instructor-verification-admin";

export const metadata = {
  title: "Instructor Verification - Admin",
  description: "Review instructor verification requests",
};

export default async function AdminInstructorVerificationPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is platform admin
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");

  if (!isPlatformAdmin) {
    redirect("/");
  }

  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const status = searchParams.status as
    | "pending"
    | "approved"
    | "rejected"
    | "needs_info"
    | undefined;

  const { requests, total, error } = await adminGetVerificationRequests({
    status: status || null,
    limit,
    offset,
  });

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-50">
          Instructor Verification Requests
        </h1>
        <p className="mt-2 text-ink-400">Review and manage instructor applications</p>
      </div>

      <InstructorVerificationAdmin
        requests={requests || []}
        total={total || 0}
        currentPage={page}
        currentStatus={status}
      />
    </div>
  );
}
