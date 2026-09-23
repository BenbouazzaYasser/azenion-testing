import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/user";
import { Footer } from "@/components/layout/footer";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <main id="main" className="relative min-h-screen overflow-hidden pt-[112px]">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-[960px] space-y-6 px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
