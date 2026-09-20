"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, GraduationCap, Lock } from "lucide-react";
import { setTeamCapability } from "@/actions/team-capabilities.actions";
import type { TeamSettingsClientProps } from "./team-settings-client";

interface SettingsCapability {
  capability: string;
  label: string;
  description: string;
  /** When enabled, the team owner implicitly holds the capability. */
}

const CAPABILITIES: SettingsCapability[] = [
  {
    capability: "course_publisher",
    label: "Course Publisher",
    description:
      "Lets the team publish Academy courses. The team owner can publish immediately; another role also needs the \"Publish courses\" permission.",
  },
];

export function SettingsCapabilitiesTab({
  team,
  isPlatformAdmin,
  capabilities,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyCapability, setBusyCapability] = useState<string | null>(null);

  function handleToggle(capability: string, enabled: boolean) {
    setBusyCapability(capability);
    const formData = new FormData();
    formData.set("team_id", team.id);
    formData.set("capability", capability);
    formData.set("enabled", String(enabled));
    formData.set("slug", team.slug);

    startTransition(async () => {
      const result = await setTeamCapability(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(enabled ? "Capability enabled." : "Capability disabled.");
      }
      setBusyCapability(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div>
          <h3 className="text-lg font-semibold text-ink-50">Team capabilities</h3>
          <p className="mt-1 text-sm text-ink-400">
            Capabilities gate what a team can do beyond its base features. Only
            platform admins can change them.
          </p>
        </div>
      </div>

      {!isPlatformAdmin ? (
        <div className="rounded-2xl bg-surface p-6 shadow-card backdrop-blur-xl">
          <div className="rounded-xl bg-surface px-4 py-3 text-sm text-ink-500">
            <Lock size={13} className="mr-1.5 inline -translate-y-px" />
            Capabilities can only be changed by platform administrators.
          </div>
        </div>
      ) : null}

      {CAPABILITIES.map((cap) => {
        const enabled = capabilities.includes(cap.capability);
        const busy = isPending && busyCapability === cap.capability;
        return (
          <div
            key={cap.capability}
            className="rounded-2xl bg-surface p-6 shadow-card backdrop-blur-xl sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/40 bg-accent/10 text-accent-300">
                  <GraduationCap size={20} />
                </span>
                <div>
                  <h4 className="text-base font-semibold text-ink-50">{cap.label}</h4>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-400">
                    {cap.description}
                  </p>
                </div>
              </div>

              {isPlatformAdmin ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggle(cap.capability, !enabled)}
                  aria-pressed={enabled}
                  className={`inline-flex h-8 w-14 items-center rounded-full border transition-colors disabled:opacity-50 ${
                    enabled ? "border-emerald-500/50 bg-emerald-500/20" : "border-border-strong bg-void-950"
                  }`}
                >
                  <span
                    className={`ml-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                      enabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              ) : (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    enabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-ink-500/30 bg-surface text-ink-400"
                  }`}
                >
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm text-ink-500">
              <Building2 size={14} className="text-ink-600" />
              {enabled
                ? "The team owner can publish courses. Members need a role with the \"Publish courses\" permission."
                : "The team cannot publish courses. Re-enable this capability to allow the owner to publish again."}
            </div>
          </div>
        );
      })}
    </div>
  );
}