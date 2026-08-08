"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  PartyPopper,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  completeOnboarding,
  joinOnboardingBranch,
  persistOnboardingStep,
  requestTeamJoin,
  saveOnboardingProfile,
} from "@/actions/onboarding.actions";
import { uploadAvatar } from "@/actions/profile.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import type {
  OnboardingBranchOption,
  OnboardingData,
  OnboardingProjectOption,
  OnboardingStep,
  OnboardingTeamOption,
} from "@/lib/onboarding-data";

type StepKey = "welcome" | "profile" | "branch" | "team" | "project";

const STEP_ORDER: StepKey[] = ["welcome", "profile", "branch", "team", "project"];
const NEXT_STEP: Record<StepKey, OnboardingStep> = {
  welcome: "profile",
  profile: "branch",
  branch: "team",
  team: "project",
  project: "done",
};

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-input";

interface OnboardingModalProps {
  data: OnboardingData;
  onClosed?: () => void;
}

export function OnboardingModal({ data, onClosed }: OnboardingModalProps) {
  const router = useRouter();

  const initialStep: OnboardingStep =
    data.step && data.step !== "done" ? data.step : "welcome";

  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useDialogFocus<HTMLDivElement>(open, { initialFocus: "panel" });
  const busyRef = useRef(false);
  busyRef.current = busy;

  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;

  function dismiss() {
    if (busyRef.current) return;
    setError(null);
    setOpen(false);
    closedRef.current?.();
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    setError(null);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advance(next: OnboardingStep) {
    try {
      setError(null);
      await persistOnboardingStep(next === "done" ? null : next);
      setStep(next);
    } catch {
      setError("Something went wrong saving your progress.");
      setStep(next);
    }
  }

  async function handleComplete(destination: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding();
    } finally {
      setBusy(false);
      setOpen(false);
      onClosed?.();
      router.push(destination);
      router.refresh();
    }
  }

  const stepIndex = step === "done" ? STEP_ORDER.length : STEP_ORDER.indexOf(step as StepKey);
  const progress = (stepIndex / STEP_ORDER.length) * 100;

  return (
    <>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
              <div
                className="absolute inset-0 bg-void-950/85 backdrop-blur-md transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                aria-hidden="true"
              />

              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Onboarding ${STEP_ORDER[stepIndex] ?? "done"} step`}
                tabIndex={-1}
                className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl border border-border-strong bg-[linear-gradient(135deg,rgba(17,18,25,0.98),rgba(9,9,13,0.98))] shadow-dialog backdrop-blur-2xl outline-none transition-all duration-200 ease-premium"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.96)",
                }}
              >
                {/* Progress header */}
                <div className="flex items-center gap-4 px-7 pb-0 pt-6">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.08] text-accent-300">
                    <Sparkles size={16} />
                  </div>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent transition-[width] duration-500 ease-premium"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {step !== "done" ? (
                    <button
                      type="button"
                      onClick={dismiss}
                      disabled={busy}
                      aria-label="Close onboarding"
                      className="-mr-1 -mt-1 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-white/[0.06] hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>

                <div className="overflow-y-auto px-7 py-6">
                  {error ? (
                    <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                      {error}
                    </div>
                  ) : null}

                  {step === "welcome" ? <WelcomeStep onNext={() => advance(NEXT_STEP.welcome)} /> : null}
                  {step === "profile" ? (
                    <ProfileStep
                      data={data}
                      busy={busy}
                      onBusy={setBusy}
                      onError={setError}
                      onNext={() => advance(NEXT_STEP.profile)}
                    />
                  ) : null}
                  {step === "branch" ? (
                    <BranchStep
                      data={data}
                      busy={busy}
                      onBusy={setBusy}
                      onError={setError}
                      onNext={() => advance(NEXT_STEP.branch)}
                    />
                  ) : null}
                  {step === "team" ? (
                    <TeamStep
                      data={data}
                      busy={busy}
                      onBusy={setBusy}
                      onError={setError}
                      onNext={() => advance(NEXT_STEP.team)}
                    />
                  ) : null}
                  {step === "project" ? (
                    <ProjectStep
                      data={data}
                      onNext={() => advance(NEXT_STEP.project)}
                    />
                  ) : null}
                  {step === "done" ? (
                    <DoneStep
                      busy={busy}
                      onCommunity={() => handleComplete("/community")}
                      onDashboard={() => handleComplete("/profile")}
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-400 shadow-glow-sm">
        <Sparkles size={28} className="text-white" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink-50">
        Welcome to Azenion
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-400">
        Azenion is a network where ambitious students, developers, and
        entrepreneurs build together. Join your campus branch, connect with the
        right teams, and turn ideas into real projects.
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">
        We lived below — it takes under a minute.
      </p>
      <Button variant="primary" size="lg" onClick={onNext} className="mt-6">
        Let&apos;s begin
        <ArrowRight size={16} />
      </Button>
    </div>
  );
}

function ProfileStep({
  data,
  busy,
  onBusy,
  onError,
  onNext,
}: {
  data: OnboardingData;
  busy: boolean;
  onBusy: (b: boolean) => void;
  onError: (e: string | null) => void;
  onNext: () => void;
}) {
  const { profile } = data;
  const [bio, setBio] = useState(profile.bio ?? "");
  const [institution, setInstitution] = useState(profile.institution ?? "");
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const hasAvatar = Boolean(avatar);
  const hasBio = Boolean(bio.trim());
  const hasInstitution = Boolean(institution.trim());
  const complete = hasAvatar && hasBio && hasInstitution;

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onError("Avatar must be under 2MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      onError("Use SVG, PNG, JPEG, or WebP.");
      return;
    }
    const fd = new FormData();
    fd.set("avatar", file);
    onBusy(true);
    onError(null);
    const result = await uploadAvatar(fd);
    onBusy(false);
    if (result?.error) {
      onError(result.error);
      return;
    }
    if (result?.avatar_url) setAvatar(result.avatar_url);
  }

  async function save() {
    onBusy(true);
    onError(null);
    const fd = new FormData();
    fd.set("bio", bio);
    fd.set("institution", institution);
    const result = await saveOnboardingProfile(fd);
    onBusy(false);
    if (result && "error" in result && result.error) {
      onError(result.error);
      return;
    }
    onNext();
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-50">
        Make it you
      </h2>
      <p className="mt-1.5 text-sm text-ink-400">
        A little detail makes your profile easy to recognize — no pressure.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={busy}
          className={cn(
            "group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-accent-400/30 bg-accent/[0.08] transition-all duration-300 hover:border-accent-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
            hasAvatar ? "" : "border-dashed",
          )}
        >
          {avatar ? (
            <img src={avatar} alt="Avatar preview" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-ink-400">
              {profile.username.charAt(0).toUpperCase() || "A"}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-void-950/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
            <Camera size={18} className="text-ink-50" />
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleAvatar}
        />
        <div className="w-full space-y-3 sm:pt-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink-200">Institution</span>
            <input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={100}
              placeholder="Your school or university"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink-200">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="A short line about what you build and care about"
              className={cn(inputClass, "resize-none leading-relaxed")}
            />
          </label>
        </div>
      </div>

      {complete ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
          <Check size={15} />
          Profile looks complete.
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button variant="ghost" size="sm" onClick={save} disabled={busy}>
          {complete ? "Looks good" : "Skip"}
        </Button>
        <Button variant="primary" size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving\u2026" : "Continue"}
          {!busy ? <ArrowRight size={15} /> : null}
        </Button>
      </div>
    </div>
  );
}

function BranchStep({
  data,
  busy,
  onBusy,
  onError,
  onNext,
}: {
  data: OnboardingData;
  busy: boolean;
  onBusy: (b: boolean) => void;
  onError: (e: string | null) => void;
  onNext: () => void;
}) {
  const [joined, setJoined] = useState<string | null>(
    data.currentBranch?.id ?? null,
  );

  async function join(branch: OnboardingBranchOption) {
    onBusy(true);
    onError(null);
    const result = await joinOnboardingBranch(branch.id);
    onBusy(false);
    if (result && "error" in result && result.error) {
      onError(result.error);
      return;
    }
    setJoined(branch.id);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-50">
        Find your branch
      </h2>
      <p className="mt-1.5 text-sm text-ink-400">
        Branches are campus hubs in the network. We picked a good match for
        you — one click to join.
      </p>

      <div className="mt-6 space-y-2.5">
        {data.branches.length === 0 ? (
          <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-5 text-center text-sm text-ink-500">
            No branches are live yet. You can join later from the Branches page.
          </div>
        ) : (
          data.branches.map((b) => {
            const isJoined = joined === b.id;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  b.recommended
                    ? "border-accent/30 bg-accent/[0.05]"
                    : "border-border-strong bg-white/[0.02]",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-accent/[0.08]">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 size={16} className="text-accent-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-50">
                    {b.name}
                    {b.recommended ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/[0.12] px-2 py-0.5 text-[11px] font-medium text-accent-300">
                        <Sparkles size={10} />
                        Recommended
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {b.member_count} {b.member_count === 1 ? "member" : "members"}
                  </p>
                </div>
                <Button
                  variant={isJoined ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => (isJoined ? onNext() : void join(b))}
                  disabled={busy}
                >
                  {isJoined ? "Joined" : "Join"}
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button variant="ghost" size="sm" onClick={onNext} disabled={busy}>
          {joined ? "Continue" : "Skip for now"}
        </Button>
        {data.branches.length > 0 ? null : (
          <Button variant="primary" size="sm" onClick={onNext} disabled={busy}>
            Continue
            <ArrowRight size={15} />
          </Button>
        )}
      </div>
    </div>
  );
}

function TeamStep({
  data,
  busy,
  onBusy,
  onError,
  onNext,
}: {
  data: OnboardingData;
  busy: boolean;
  onBusy: (b: boolean) => void;
  onError: (e: string | null) => void;
  onNext: () => void;
}) {
  const [requested, setRequested] = useState<string[]>([]);

  async function join(team: OnboardingTeamOption) {
    onBusy(true);
    onError(null);
    const result = await requestTeamJoin(team.id);
    onBusy(false);
    if (result && "error" in result && result.error) {
      onError(result.error);
      return;
    }
    setRequested((prev) => (prev.includes(team.id) ? prev : [...prev, team.id]));
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-50">
        Join a team
      </h2>
      <p className="mt-1.5 text-sm text-ink-400">
        Teams collaborate on real projects. Joining one makes it easy to find
        your next build — optional, but recommended.
      </p>

      <div className="mt-6 space-y-2.5">
        {data.teams.length === 0 ? (
          <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-6 text-center text-sm text-ink-500">
            No active teams yet. You can browse teams anytime.
          </div>
        ) : (
          data.teams.map((t) => {
            const done = requested.includes(t.id);
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-border-strong bg-white/[0.02] p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-surface-500/[0.12]">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users size={16} className="text-ink-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-50">
                    {t.name}
                    {t.trending ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/[0.12] px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                        <TrendingUp size={10} />
                        Trending
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {t.member_count} {t.member_count === 1 ? "member" : "members"}
                    {t.description ? ` \u2022 ${t.description}` : ""}
                  </p>
                </div>
                <Button
                  variant={done ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => (done ? onNext() : void join(t))}
                  disabled={busy}
                >
                  {done ? "Requested" : "Request"}
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button variant="ghost" size="sm" onClick={onNext} disabled={busy}>
          Skip
        </Button>
        {requested.length > 0 ? (
          <Button variant="primary" size="sm" onClick={onNext} disabled={busy}>
            Continue
            <ArrowRight size={15} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ProjectStep({
  data,
  onNext,
}: {
  data: OnboardingData;
  onNext: () => void;
}) {
  const [browsed, setBrowsed] = useState(false);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-50">
        Discover projects
      </h2>
      <p className="mt-1.5 text-sm text-ink-400">
        Project pages are where teams share what they&apos;re building. Browse
        a few to stay inspired — you can always come back later.
      </p>

      <div className="mt-6 space-y-2.5">
        {data.projects.length === 0 ? (
          <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-6 text-center text-sm text-ink-500">
            Featured projects are on the way.
          </div>
        ) : (
          data.projects.map((p) => (
            <ProjectRow key={p.id} project={p} onViewed={() => setBrowsed(true)} />
          ))
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button variant="ghost" size="sm" onClick={onNext}>
          Skip intro
        </Button>
        <Button variant="primary" size="sm" onClick={onNext}>
          {browsed ? "Looks inspiring" : "Got it"}
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onViewed,
}: {
  project: OnboardingProjectOption;
  onViewed: () => void;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        onViewed();
        router.push(`/projects/${project.slug}`);
      }}
      className="flex w-full items-center gap-3 rounded-xl border border-border-strong bg-white/[0.02] p-3 text-left transition-colors hover:border-accent-400/30 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.1] bg-accent/[0.08]">
        {project.logo_url ? (
          <img src={project.logo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Rocket size={16} className="text-accent-300" />
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-ink-50">{project.name}</p>
        <p className="truncate text-xs text-ink-500">
          {project.member_count} {project.member_count === 1 ? "member" : "members"}
        </p>
      </div>
      <ArrowRight size={15} className="shrink-0 text-ink-500" />
    </button>
  );
}

function DoneStep({
  busy,
  onCommunity,
  onDashboard,
}: {
  busy: boolean;
  onCommunity: () => void;
  onDashboard: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-accent shadow-glow-sm">
        <PartyPopper size={28} className="text-void-950" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink-50">
        You&apos;re ready to build
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-400">
        Your branch, teams, and profile are set. Jump into the network and start
        turning ideas into real projects.
      </p>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          size="lg"
          onClick={onCommunity}
          disabled={busy}
          className="flex-1"
        >
          Go to Community
          <ArrowRight size={16} />
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onDashboard}
          disabled={busy}
          className="flex-1"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}