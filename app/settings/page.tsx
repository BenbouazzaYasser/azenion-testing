import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, getOrCreateProfile, getUserBranch } from "@/lib/profile-data";
import { getDeletionStatus, getUserSettings } from "@/lib/settings-data";
import { runDeletionSweep } from "@/actions/settings.actions";
import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = {
  title: "Settings | Azenion",
};

export default async function SettingsRoute() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(user);
  if (!profile) {
    redirect("/profile");
  }

  const [branch, settings, deletion] = await Promise.all([
    getUserBranch(user.id),
    getUserSettings(),
    getDeletionStatus(),
  ]);

  await runDeletionSweep();

  return (
    <SettingsPage
      account={{
        userId: user.id,
        email: user.email ?? "",
        emailVerified: !!user.email_confirmed_at,
        username: profile.username ?? null,
        createdAt: profile.created_at ?? user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      }}
      profile={{
        id: profile.id ?? user.id,
        full_name: profile.full_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? null,
        avatar_url: profile.avatar_url ?? null,
        institution: profile.institution ?? null,
        skills: profile.skills ?? [],
        github_url: profile.github_url ?? null,
        linkedin_url: profile.linkedin_url ?? null,
      }}
      branch={branch}
      settings={settings}
      deletion={deletion}
    />
  );
}