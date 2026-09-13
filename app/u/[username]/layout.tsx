import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export default async function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-hidden pt-[112px]">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-[960px] space-y-6 px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}