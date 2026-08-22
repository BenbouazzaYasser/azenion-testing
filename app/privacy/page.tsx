import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Privacy Policy — Azenion",
  description:
    "Learn how Azenion collects, uses, and protects your personal information.",
  openGraph: {
    title: "Privacy Policy — Azenion",
    description:
      "How Azenion collects, uses, and protects your personal information.",
  },
};

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly, such as your name, email address, and profile details, as well as usage information gathered automatically as you interact with the platform.",
  },
  {
    title: "2. How We Use Your Information",
    body: "We use your information to provide and improve the platform, personalize your experience, connect you with other members, and communicate with you about your account and the service.",
  },
  {
    title: "3. Sharing of Information",
    body: "We do not sell your personal information. We may share it with service providers who help us operate the platform, or where required by law.",
  },
  {
    title: "4. Data Retention",
    body: "We retain your information for as long as your account is active and as needed to provide the service. You may delete your account at any time, after which your data is removed in line with our retention policy.",
  },
  {
    title: "5. Your Rights and Choices",
    body: "Depending on your location, you may have rights to access, correct, or delete your personal information. You can manage much of this directly from your account settings.",
  },
  {
    title: "6. Security",
    body: "We use reasonable technical and organizational measures to protect your information, though no method of transmission over the internet is completely secure.",
  },
  {
    title: "7. Children's Privacy",
    body: "The platform is not directed to children under 13, and we do not knowingly collect personal information from them.",
  },
  {
    title: "8. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. Significant changes will be reflected on this page, and continued use of the platform constitutes acceptance of the updated policy.",
  },
  {
    title: "9. Contact",
    body: "If you have questions about this Privacy Policy, please reach out through our Contact page.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <p className="text-sm font-medium uppercase tracking-wider text-accent-400">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            Privacy Policy
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

          <p className="mt-12 pt-8 text-sm leading-relaxed text-ink-500">
            This Privacy Policy is provided as a placeholder and does not
            constitute legal advice. It will be finalized before public launch.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}