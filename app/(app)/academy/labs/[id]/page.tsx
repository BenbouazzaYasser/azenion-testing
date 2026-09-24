import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { FlaskConical, ArrowLeft } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { PageBridge } from "@/components/sections/page-bridge";
import { PageHero } from "@/components/layout/page-hero";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import type {
  PlayerVersion,
  PlayerSubmission,
} from "@/components/sections/academy/lab-player";
import { getLabWithContent } from "@/actions/academy-labs.actions";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/user";

// Code-split: the ~600-line interactive player hydrates after the page
// shell (navbar/hero) paints; skeleton holds layout to avoid CLS.
const LabPlayer = nextDynamic(
  () =>
    import("@/components/sections/academy/lab-player").then((mod) => ({
      default: mod.LabPlayer,
    })),
  {
    loading: () => (
      <div className="mx-auto w-full max-w-[880px] px-5 py-16 sm:px-8" aria-hidden>
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-lg bg-surface" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded-lg bg-surface" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface" />
      </div>
    ),
  },
);

interface LabDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LabDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getLabWithContent(id);
  if (!result || "error" in result) return {};
  return {
    title: `${result.lab.title} | Azenion Academy Labs`,
    description: result.lab.description ?? `A hands-on lab on Azenion Academy.`,
    alternates: {
      canonical: `/academy/labs/${id}`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function LabDetailPage({ params }: LabDetailPageProps) {
  const { id } = await params;
  const result = await getLabWithContent(id);

  if (!result || "error" in result) {
    return <LabNotFound />;
  }

  const { lab, version } = result;

  // Solution and test files are instructor/grading material, not learner
  // resources -- deliberately not forwarded to the client at all (not
  // just hidden in the UI), so they never reach page props or the
  // client bundle in the first place.
  const safeVersion: PlayerVersion | null = version
    ? {
        id: version.id,
        version_number: version.version_number,
        instructions_url: version.instructions_url,
        starter_code_url: version.starter_code_url,
        resources_url: version.resources_url,
        content: version.content,
      }
    : null;

  const supabase = await createClient();
  const user = await getSessionUser();

  let initialSubmission: PlayerSubmission | null = null;
  if (user) {
    const { data } = await supabase
      .from("lab_submissions")
      .select("status, score, submitted_at, evaluated_at, test_results")
      .eq("lab_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      initialSubmission = {
        status: data.status,
        score: data.score,
        test_results: (data.test_results as PlayerSubmission["test_results"]) ?? null,
      };
    }
  }

  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <ErrorBoundary
          fallbackTitle="Lab player failed to load"
          fallbackMessage="Unable to load the lab content. You can try reloading or go back to the labs list."
        >
          <LabPlayer lab={lab} version={safeVersion} initialSubmission={initialSubmission} isAuthenticated={Boolean(user)} />
        </ErrorBoundary>
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}

function LabNotFound() {
  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <PageHero variant="academy" slug="academy" atmosphere={false}>
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface text-accent-300">
              <FlaskConical size={32} />
            </div>
            <h1 className="mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl">Lab not found</h1>
            <p className="mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
              This lab doesn&apos;t exist, isn&apos;t published yet, or you don&apos;t have access to it.
            </p>
            <Link
              href="/academy/labs"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 ease-premium hover:bg-accent-500"
            >
              <ArrowLeft size={14} />
              Back to Labs
            </Link>
          </div>
        </PageHero>
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
