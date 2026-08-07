"use client";

import { TogglePreferences, type PrefItem } from "./toggle-preferences";
import type { PrivacySettings } from "@/lib/settings-data";
import { updateSettings } from "@/actions/settings.actions";

const PRIVACY_ITEMS: PrefItem[] = [
  {
    key: "show_profile_publicly",
    label: "Public profile",
    description: "Let others view your profile on the network.",
  },
  {
    key: "search_visibility",
    label: "Search visibility",
    description: "Appear in network and global search results.",
  },
  {
    key: "allow_dms",
    label: "Allow DMs",
    description: "Let other members start conversations with you.",
  },
  {
    key: "show_activity",
    label: "Show activity",
    description: "Display your recent activity on your profile.",
  },
];

/**
 * Privacy controls. These are stored today and become the source of truth for
 * future features (profile visibility, messaging guardrails, and search
 * indexing), so each toggle is already enforced by the settings layer.
 */
export function PrivacySection({ initial }: { initial: PrivacySettings }) {
  return (
    <TogglePreferences
      items={PRIVACY_ITEMS}
      initial={{ ...initial }}
      saveAction={(patch) => updateSettings({ privacy: patch })}
    />
  );
}