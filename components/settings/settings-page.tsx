"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  User,
  UserRound,
  Bell,
  Shield,
  Monitor,
  TriangleAlert,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountSection } from "./account-section";
import { ProfileSection } from "./profile-section";
import { NotificationsSection } from "./notifications-section";
import { PrivacySection } from "./privacy-section";
import { AppearanceSection } from "./appearance-section";
import { DangerZoneSection } from "./danger-zone-section";
import type { UserSettings } from "@/lib/settings-data";

type SectionId = "account" | "profile" | "notifications" | "privacy" | "appearance" | "danger";

interface SettingsPageProps {
  account: {
    userId: string;
    email: string;
    emailVerified: boolean;
    username: string | null;
    createdAt: string | null;
    lastSignInAt: string | null;
  };
  profile: {
    id: string;
    full_name: string;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    institution: string | null;
    skills: string[];
    github_url: string | null;
    linkedin_url: string | null;
  };
  branch: { name: string; slug: string } | null;
  settings: UserSettings;
}

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: typeof User;
}[] = [
  { id: "account", label: "Account", icon: User },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "danger", label: "Danger Zone", icon: TriangleAlert },
];

const SECTION_DESCRIPTIONS: Record<SectionId, string> = {
  account: "Email, password and security.",
  profile: "Your public identity and information.",
  notifications: "Choose what you hear about.",
  privacy: "Control how you appear across the network.",
  appearance: "Set the look and feel.",
  danger: "Irreversible actions.",
};

export function SettingsPage({ account, profile, branch, settings }: SettingsPageProps) {
  const [active, setActive] = useState<SectionId>("account");
  const [dirty, setDirty] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<SectionId | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const switchTo = useCallback((section: SectionId) => {
    setActive(section);
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const requestSwitch = useCallback(
    (section: SectionId) => {
      if (section === active) return;
      if (dirty) {
        setPendingTarget(section);
        return;
      }
      switchTo(section);
    },
    [active, dirty, switchTo],
  );

  const confirmDiscard = useCallback(() => {
    setDirty(false);
    if (pendingTarget) {
      switchTo(pendingTarget);
      setPendingTarget(null);
    }
  }, [pendingTarget, switchTo]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function handleNavKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = (index + 1) % SECTIONS.length;
      navRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (index - 1 + SECTIONS.length) % SECTIONS.length;
      navRefs.current[prev]?.focus();
    }
  }

  return (
    <div className="relative">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-ink-50 sm:text-3xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-accent-300">
              <Settings2 size={20} />
            </span>
            Settings
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            The central place for your preferences and account management.
          </p>
        </div>
        {dirty ? (
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 sm:inline-flex">
            Unsaved changes
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <nav
          aria-label="Settings sections"
          className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto"
        >
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {SECTIONS.map((section, index) => {
              const isActive = active === section.id;
              return (
                <li key={section.id} className="shrink-0">
                  <button
                    ref={(el) => {
                      navRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => requestSwitch(section.id)}
                    onKeyDown={(e) => handleNavKeyDown(e, index)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 lg:w-full",
                      isActive
                        ? "border-accent-400/30 bg-white/[0.05] text-ink-50 shadow-[0_0_18px_-8px_rgba(90,120,255,0.5)]"
                        : "border-transparent text-ink-400 hover:bg-white/[0.04] hover:text-ink-200",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg",
                        isActive
                          ? "bg-accent/[0.12] text-accent-200"
                          : "bg-white/[0.03] text-ink-400",
                      )}
                    >
                      <section.icon size={15} />
                    </span>
                    {section.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div ref={contentRef} className="min-h-[60vh] min-w-0 overflow-y-auto pr-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mb-1 text-2xl font-semibold text-ink-50 outline-none"
          >
            {SECTIONS.find((s) => s.id === active)?.label}
          </h2>
          <p className="mb-5 text-sm text-ink-500">{SECTION_DESCRIPTIONS[active]}</p>

          <div className={cn(active !== "account" && "hidden")}>
            <AccountSection
              userId={account.userId}
              currentEmail={account.email}
              emailVerified={account.emailVerified}
              currentUsername={account?.username ?? null}
              createdAt={account?.createdAt ?? null}
              lastSignInAt={account?.lastSignInAt ?? null}
              onDirty={setDirty}
            />
          </div>
          <div className={cn(active !== "profile" && "hidden")}>
            <ProfileSection profile={profile} branch={branch} />
          </div>
          <div className={cn(active !== "notifications" && "hidden")}>
            <NotificationsSection initial={settings.notifications} />
          </div>
          <div className={cn(active !== "privacy" && "hidden")}>
            <PrivacySection initial={settings.privacy} />
          </div>
          <div className={cn(active !== "appearance" && "hidden")}>
            <AppearanceSection />
          </div>
          <div className={cn(active !== "danger" && "hidden")}>
            <DangerZoneSection />
          </div>
        </div>
      </div>

      {pendingTarget ? (
        <ConfirmOverlay onStay={() => setPendingTarget(null)} onDiscard={confirmDiscard} />
      ) : null}
    </div>
  );
}

function ConfirmOverlay({
  onStay,
  onDiscard,
}: {
  onStay: () => void;
  onDiscard: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="alertdialog" aria-modal="true" aria-label="Unsaved changes">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onStay}
      />
      <div
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(20,20,28,0.98),rgba(8,8,12,0.98))] shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? "scale(1)" : "scale(0.96)" }}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h3 className="text-base font-semibold text-ink-50">Unsaved changes</h3>
            <p className="mt-1 text-sm text-ink-400">Your changes may not be saved.</p>
          </div>
          <button
            type="button"
            onClick={onStay}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-white/[0.06] hover:text-ink-50"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-5">
          <Button variant="secondary" size="sm" onClick={onStay}>
            Go back
          </Button>
          <Button variant="primary" size="sm" onClick={onDiscard}>
            Discard and continue
          </Button>
        </div>
      </div>
    </div>
  );
}