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
    body: "We collect information you provide directly and information generated as you use the platform.",
    bodyList: [
      "Account and profile information — your email address, username, full name, password (stored securely by our authentication provider), and any profile details you add such as your bio, avatar, links, skills, and institution. If you sign in with Google, we receive the basic profile information Google provides, such as your name and email address.",
      "Content you create — posts, comments, likes, saved posts, shares, projects, branches, teams, and any text, images, or videos you upload. Uploaded images and videos are stored on our hosting provider.",
      "Messaging and calls — the content of direct messages, conversation metadata, and call event records (such as call type and timestamps of call signaling events). Call signaling data is deleted shortly after each call ends. We do not record the audio or video of calls.",
      "Usage information — pages you visit, the browser and device you use, your general geographic region, and post view counts. Post views are tracked with an anonymous token stored in your browser, not with your account identity.",
      "Social relationships — who you follow, friend requests, who you block, and similar relationship data needed to power the platform.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    body: "We use your information to operate and improve Azenion, including to:",
    bodyList: [
      "Create and manage your account, authenticate you, and secure your session.",
      "Provide the core platform — the feed, profiles, projects, teams, messaging, voice and video calls, search, and notifications.",
      "Send you transactional messages about your account, such as our welcome email. We do not send marketing email without your consent.",
      "Understand aggregate usage patterns so we can improve the product and fix issues.",
      "Prevent abuse, enforce our Terms of Service, and comply with legal obligations.",
    ],
  },
  {
    title: "3. Cookies and Local Storage",
    body: "We use cookies and browser storage for essential functions:",
    bodyList: [
      "Authentication — session cookies managed by our authentication provider keep you signed in.",
      "Preferences — your theme choice is stored in your browser so it persists across visits.",
      "Anonymous usage tracking — a local token is used to count a post view once per browser, without linking it to your account.",
      "Analytics — our hosting provider collects privacy-friendly, aggregate analytics that do not require cookies to track you across sites.",
    ],
  },
  {
    title: "4. How We Share Your Information",
    body: "We do not sell your personal information. We share information only with service providers that help us operate the platform, and only as needed to provide the service:",
    bodyList: [
      "Supabase — provides our database, authentication, file storage, and realtime messaging infrastructure. Your account data, messages, and uploads are processed by Supabase on our behalf.",
      "Vercel — hosts the application and provides privacy-friendly web analytics.",
      "Resend — sends transactional emails, such as our welcome email. We share only the recipient address and the personalization needed to address you.",
      "Google — when you choose to sign in with Google, Google shares your basic profile information with us.",
      "Public content — information you choose to make public, such as your profile and posts, is visible to other users of the platform.",
      "Legal requirements — we may disclose information where required by law, or to protect the rights, safety, and security of Azenion, our users, or others.",
    ],
  },
  {
    title: "5. Data Retention",
    body: "We retain your information for as long as your account is active and as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our agreements.",
    bodyList: [
      "Account data is retained while your account is active.",
      "Call signaling records are deleted automatically shortly after a call ends.",
      "Anonymous analytics are retained by our hosting provider in aggregate form.",
      "When account deletion becomes available (see Section 6), we will remove or anonymize your personal data in line with this policy.",
    ],
  },
  {
    title: "6. Your Rights and Choices",
    body: "We respect your control over your personal information.",
    bodyList: [
      "Access and correction — you can view and edit most of your profile and account information directly from your account settings.",
      "Content control — you can delete individual posts and other content you have created.",
      "Account deletion — full self-service account deletion is not yet available on the platform; we are building it and will announce it when it ships. Until then, please contact us and we will assist you with any deletion request.",
      "Depending on where you live, you may also have the right to request a copy of your data, request its deletion, or object to or restrict certain processing. To exercise any of these rights, contact us using the details in Section 9.",
    ],
  },
  {
    title: "7. Security",
    body: "We use reasonable technical and organizational measures to protect your information, including transport-layer encryption in transit, row-level security on our database, access controls, and secure handling of uploaded media. That said, no method of transmission or storage over the internet is completely secure, and we cannot guarantee absolute security.",
  },
  {
    title: "8. Children's Privacy",
    body: "The platform is not directed to children under 13, and we do not knowingly collect personal information from them. If you believe a child under 13 has provided us with personal information, please contact us and we will take steps to remove it.",
  },
  {
    title: "9. Contact",
    body: "If you have questions or concerns about this Privacy Policy or your personal data, you can reach us by email at Azenion@outlook.com or through our Contact page.",
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
                {section.bodyList ? (
                  <ul className="mt-3 space-y-3">
                    {section.bodyList.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-400"
                      >
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-border-strong pt-8 text-sm leading-relaxed text-ink-500">
            This Privacy Policy reflects how the Azenion platform currently
            operates and is provided for transparency. It does not constitute
            legal advice. Azenion will continue to refine this policy as the
            platform evolves.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}