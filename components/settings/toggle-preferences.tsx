"use client";

import { useState } from "react";
import { SettingToggle } from "./setting-toggle";
import { SettingsPanel, SaveIndicator, type SaveState } from "./settings-panel";

export interface PrefItem {
  key: string;
  label: string;
  description?: string;
}

interface TogglePreferencesProps {
  items: PrefItem[];
  initial: Record<string, boolean>;
  saveAction: (patch: Record<string, boolean>) => Promise<{ error?: string } | { success?: boolean }>;
}

/**
 * Toggle preferences that auto-save on change with optimistic UI. A transient
 * status pill mirrors the server state so saves are always visible.
 */
export function TogglePreferences({ items, initial, saveAction }: TogglePreferencesProps) {
  const [values, setValues] = useState<Record<string, boolean>>({ ...initial });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  function update(key: string, checked: boolean) {
    const next = { ...values, [key]: checked };
    setValues(next);
    setError(null);
    setSaveState("saving");
    void saveAction(next)
      .then((res) => {
        if (res && "error" in res && res.error) {
          setSaveState("idle");
          setError(res.error);
        } else {
          setSaveState("saved");
          window.setTimeout(() => setSaveState("idle"), 2000);
        }
      })
      .catch(() => {
        setSaveState("idle");
        setError("Something went wrong while saving.");
      });
  }

  return (
    <SettingsPanel>
      <div className="divide-y divide-white/[0.05]">
        {items.map((item) => (
          <div key={item.key} className="px-6 py-4">
            <SettingToggle
              checked={!!values[item.key]}
              onChange={(checked) => update(item.key, checked)}
              label={item.label}
              description={item.description}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
        <div className="min-w-0">
          {error ? (
            <p className="text-xs text-red-300">{error}</p>
          ) : (
            <p className="text-xs text-ink-600">Changes save automatically.</p>
          )}
        </div>
        <SaveIndicator state={saveState} />
      </div>
    </SettingsPanel>
  );
}