import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ContactHero } from "@/components/sections/contact/hero";
import { ContactSection } from "@/components/sections/contact/contact-section";
import { Faq } from "@/components/sections/contact/faq";
import { ContactCta } from "@/components/sections/contact/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Contact | Azenion",
  description:
    "Get in touch with Azenion — whether you want to join the community, collaborate, ask questions, or explore partnerships.",
  openGraph: {
    title: "Contact | Azenion",
    description:
      "Get in touch with Azenion — whether you want to join the community, collaborate, ask questions, or explore partnerships.",
  },
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <ContactHero />
        <ContactSection />
        <Faq />
        <ContactCta />
      </main>
      <Footer />
    </>
  );
}
