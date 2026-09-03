"use client";

import { useState, useTransition } from "react";
import { TriangleAlert, LogOut, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "./settings-panel";
import { DeleteAccountModal } from "@/components/sections/profile/delete-account-modal";
import { signOutEverywhere } from "@/actions/settings.actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/components/translation/translation-provider";

export function DangerZoneSection() {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [signedOutEverywhere, setSignedOutEverywhere] = useState(false);

  function handleSignOutEverywhere() {
    startTransition(async () => {
      const res = await signOutEverywhere();
      if (res && "unavailable" in res && (res as { unavailable?: boolean }).unavailable) {
        toast.info(t("settings.signOutEverywhereToast"));
        setSignedOutEverywhere(true);
      } else if (res && "error" in res && (res as { error?: string }).error) {
        toast.error(String((res as { error: string }).error));
      } else {
        toast.success("Signed out from all devices");
      }
    });
  }

  return (
    <div className="space-y-4">
      <SettingsPanel className="border-red-500/20">
        <div className="flex items-start gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
            <TriangleAlert size={18} className="text-red-400" />
          </div>
          <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-red-400">{t("settings.deleteAccount")}</h3>
              <p className="mt-1 max-w-md text-sm text-ink-400">
                {t("settings.deleteAccountDesc")}
              </p>
            </div>
            <DeleteAccountModal />
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-center gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface">
            <ShieldOff size={18} className="text-ink-300" />
          </div>
          <div className="flex flex-1 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-medium text-ink-50">{t("settings.signOutEverywhere")}</h3>
              <p className="mt-1 text-sm text-ink-400">
                {signedOutEverywhere
                  ? t("settings.signOutEverywhereUnavailable")
                  : t("settings.signOutEverywhereDesc")}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSignOutEverywhere} disabled={isPending || signedOutEverywhere}>
              {isPending ? t("settings.waiting") : signedOutEverywhere ? t("settings.unavailable") : t("settings.signOutEverywhere")}
            </Button>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-center gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface">
            <LogOut size={18} className="text-ink-300" />
          </div>
          <div className="flex flex-1 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-medium text-ink-50">{t("settings.signOutThisDevice")}</h3>
              <p className="mt-1 text-sm text-ink-400">{t("settings.signOutThisDeviceDesc")}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              {t("auth.signOut")}
            </Button>
          </div>
        </div>
      </SettingsPanel>
    </div>
  );
}