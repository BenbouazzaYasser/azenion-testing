import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Terms of Service — Azenion",
  description:
    "Read the Terms of Service governing your use of the Azenion platform.",
  openGraph: {
    title: "Terms of Service — Azenion",
    description:
      "The terms that govern your use of the Azenion platform.",
  },
};

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By creating an account or using the Azenion platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
  },
  {
    title: "2. Eligibility",
    body: "You must be at least 13 years old and able to enter into a binding agreement to use Azenion. If you are using the platform on behalf of an organization, you confirm that you have the authority to accept these terms on its behalf.",
  },
  {
    title: "3. Your Account",
    body: "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.",
  },
  {
    title: "4. Acceptable Use",
    body: "You agree not to misuse the platform, including by posting unlawful content, attempting to compromise security, or engaging in activity that harms other members or the platform itself.",
  },
  {
    title: "5. Content and Intellectual Property",
    body: "You retain ownership of the content you submit. By posting content, you grant Azenion a limited license to host, display, and distribute it so that the platform can function.",
  },
  {
    title: "6. Termination",
    body: "We may suspend or terminate your access if you violate these terms. You may stop using the platform and delete your account at any time.",
  },
  {
    title: "7. Disclaimers and Limitation of Liability",
    body: "The platform is provided as-is, without warranties of any kind. To the maximum extent permitted by law, Azenion is not liable for indirect, incidental, or consequential damages arising from your use of the platform.",
  },
  {
    title: "8. Changes to These Terms",
    body: "We may update these Terms from time to time. Material changes will be reflected on this page, and continued use of the platform constitutes acceptance of the updated terms.",
  },
  {
    title: "9. Contact",
    body: "If you have questions about these Terms of Service, please reach out through our Contact page.",
  },
];

export default function TermsPage() {
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
        <div className="relative mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <p className="text-sm font-medium uppercase tracking-wider text-accent-400">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="mt-10 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-ink-100">
                  {section.title}
                </h2>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-400">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-border-strong pt-8 text-sm leading-relaxed text-ink-500">
            These Terms of Service are provided as a placeholder and do not
            constitute legal advice. They will be finalized before public launch.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}