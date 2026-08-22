import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { RoleManager } from "@/components/admin/role-manager";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Platform admins live in `platform_admins` (00028) — deliberately separate
  // from the `user_roles` catalog managed on this page.
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");

  if (!isPlatformAdmin) {
    redirect("/");
  }

  // The role catalog drives the GUI: future roles only need a row in
  // public.roles (via admin_grant_role's catalog lookup) to become manageable.
  const { data: roleCatalog } = await supabase
    .from("roles")
    .select("name, description")
    .order("name", { ascending: true });

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-hidden pt-[112px]">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-[1120px] space-y-6 px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent-400/30 bg-accent-400/10">
              <ShieldCheck size={24} className="text-accent-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-ink-50">Role management</h1>
              <p className="mt-1 text-sm text-ink-400">
                Grant or revoke platform roles. Assignments are made explicitly —
                never inferred from names, emails, or signup.
              </p>
            </div>
          </div>

          <RoleManager
            roleCatalog={(roleCatalog ?? []).map((r) => ({
              name: r.name,
              description: r.description,
            }))}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
