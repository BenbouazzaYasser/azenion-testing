import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { LoginCard } from "@/components/sections/login/login-card";
import { SecurityNote } from "@/components/sections/login/security-note";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Sign In | Azenion — The Limitless Network",
  description:
    "Sign in to Azenion and continue building, collaborating, and shaping the future with the Limitless Network.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolved = await searchParams;
  const next = typeof resolved?.next === "string" ? resolved.next : undefined;

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <LoginCard next={next} />
        <SecurityNote />
      </main>
      <Footer />
    </>
  );
}
