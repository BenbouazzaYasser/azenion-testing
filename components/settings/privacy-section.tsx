"use client";

import { TogglePreferences, type PrefItem } from "./toggle-preferences";
import type { PrivacySettings } from "@/lib/settings-data";
import { updateSettings } from "@/actions/settings.actions";

const PRIVACY_ITEMS: PrefItem[] = [
  {
    key: "show_profile_publicly",
    labelKey: "settings.privacyPublicProfile",
    descriptionKey: "settings.privacyPublicProfileDesc",
  },
  {
    key: "search_visibility",
    labelKey: "settings.privacySearchVisibility",
    descriptionKey: "settings.privacySearchVisibilityDesc",
  },
  {
    key: "allow_dms",
    labelKey: "settings.privacyAllowDms",
    descriptionKey: "settings.privacyAllowDmsDesc",
  },
  {
    key: "show_activity",
    labelKey: "settings.privacyShowActivity",
    descriptionKey: "settings.privacyShowActivityDesc",
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