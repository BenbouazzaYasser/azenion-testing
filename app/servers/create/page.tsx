import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { CreateServerForm } from "@/components/servers/create-server-form";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Create a Server | Azenion — The Limitless Network",
  description: "Create your own Azenion server with channels for your community.",
};

export default async function CreateServerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/servers/create")}`);
  }

  return (
    <>
      <Navbar />
      <main className="relative min-h-dvh overflow-hidden pb-20 pt-[100px] sm:pt-[110px]">
        <PageAtmosphere />
        <div className="relative mx-auto w-full max-w-xl px-4 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-50">{await serverT("servers.createTitle")}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-400">
            {await serverT("servers.createSub")}
          </p>

          <div className="mt-8 rounded-3xl bg-surface/50 p-6 shadow-card backdrop-blur-xl sm:p-8">
            <CreateServerForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
