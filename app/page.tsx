import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Features } from "@/components/sections/features";
import { Institutions } from "@/components/sections/institutions";
import { PageBridge } from "@/components/sections/page-bridge";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <Hero />
        <About />
        <Features />
        <Institutions />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
