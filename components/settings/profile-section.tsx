"use client";

import { EditProfileDialog } from "@/components/sections/profile/edit-profile-dialog";
import { SettingsPanel } from "./settings-panel";
import { Github, Linkedin, Sparkles, Building2, UserCircle, Link2 } from "lucide-react";

interface ProfileSheetProps {
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
}

/**
 * Reuses the existing EditProfileDialog (avatar, bio, skills, institution,
 * social links) while surfacing an at-a-glance summary of the public profile.
 */
export function ProfileSection({ profile, branch }: ProfileSheetProps) {
  return (
    <div className="space-y-4">
      <SettingsPanel>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border-strong/[0.08] bg-gradient-to-br from-accent/[0.15] to-accent/[0.05]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-accent-300">
                  {(profile.full_name || profile.username || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-ink-50">{profile.full_name || "Your name"}</h3>
              <p className="truncate text-sm text-ink-400">
                {profile.username ? `@${profile.username}` : "Set a username"}
              </p>
            </div>
          </div>
          <EditProfileDialog profile={profile} branch={branch} />
        </div>
      </SettingsPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsPanel>
          <SummaryRow icon={<UserCircle size={16} className="text-accent-300" />} label="Bio">
            {profile.bio ? <span className="text-ink-200">{profile.bio}</span> : <span className="text-ink-500">No bio yet</span>}
          </SummaryRow>
        </SettingsPanel>
        <SettingsPanel>
          <SummaryRow icon={<Building2 size={16} className="text-accent-300" />} label="Institution">
            {profile.institution ? <span className="text-ink-200">{profile.institution}</span> : <span className="text-ink-500">Not set</span>}
          </SummaryRow>
        </SettingsPanel>
        <SettingsPanel>
          <SummaryRow icon={<Sparkles size={16} className="text-accent-300" />} label="Skills">
            {profile.skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.slice(0, 6).map((skill) => (
                  <span key={skill} className="rounded-full border border-border-strong/[0.08] bg-surface px-2 py-0.5 text-[11px] text-ink-200">
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 6 ? (
                  <span className="rounded-full border border-border-strong/[0.08] bg-surface px-2 py-0.5 text-[11px] text-ink-400">
                    +{profile.skills.length - 6}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-ink-500">No skills yet</span>
            )}
          </SummaryRow>
        </SettingsPanel>
        <SettingsPanel>
          <SummaryRow icon={<Link2 size={16} className="text-accent-300" />} label="Social links">
            <div className="flex gap-3 text-ink-300">
              {profile.github_url ? (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border-strong/[0.08] px-2 py-1 text-xs hover:text-ink-50" aria-label="GitHub profile">
                  <Github size={14} /> GitHub
                </a>
              ) : (
                <span className="text-ink-500">No GitHub</span>
              )}
              {profile.linkedin_url ? (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border-strong/[0.08] px-2 py-1 text-xs hover:text-ink-50" aria-label="LinkedIn profile">
                  <Linkedin size={14} /> LinkedIn
                </a>
              ) : (
                <span className="text-ink-500">No LinkedIn</span>
              )}
            </div>
          </SummaryRow>
        </SettingsPanel>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 p-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">{label}</h3>
        <div className="mt-1.5 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}