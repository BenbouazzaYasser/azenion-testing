"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, Users, ShieldCheck, Mail, AlertTriangle } from "lucide-react";
import { SettingsOverviewTab } from "./settings-overview-tab";
import { SettingsMembersTab } from "./settings-members-tab";
import { SettingsRolesTab } from "./settings-roles-tab";
import { SettingsInvitationsTab } from "./settings-invitations-tab";
import { SettingsDangerTab } from "./settings-danger-tab";

export interface SettingsTeam {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  visibility: string;
  created_at: string;
}

export interface SettingsRole {
  id: string;
  team_id: string;
  name: string;
  color: string | null;
  permissions: string[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface SettingsMember {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string | null;
  role_ids: string[];
}

export interface SettingsJoinRequest {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export interface SettingsInvitation {
  id: string;
  invited_user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  invited_by_username: string | null;
  status: string;
  created_at: string;
}

export interface SettingsCategory {
  id: string;
  name: string;
  slug: string;
}

type TabId = "overview" | "members" | "roles" | "invitations" | "danger";

export interface TeamSettingsClientProps {
  team: SettingsTeam;
  isOwner: boolean;
  isPlatformAdmin: boolean;
  canManageRoles: boolean;
  canInvite: boolean;
  canReviewRequests: boolean;
  canRemoveMembers: boolean;
  canEditInfo: boolean;
  canEditAppearance: boolean;
  roles: SettingsRole[];
  members: SettingsMember[];
  joinRequests: SettingsJoinRequest[];
  invitations: SettingsInvitation[];
  categories: SettingsCategory[];
  teamCategoryIds: string[];
  currentUserId: string;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "members", label: "Members", icon: Users },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "invitations", label: "Invitations", icon: Mail },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export function TeamSettingsClient(props: TeamSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { team } = props;
  const visibleTabs = props.isOwner ? TABS : TABS.filter((t) => t.id !== "danger");

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="team-settings-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Link
          href={`/teams/${team.slug}`}
          className="inline-flex items-center gap-2 text-sm text-ink-400 transition-colors hover:text-accent-300"
        >
          <ArrowLeft size={14} />
          Back to {team.name}
        </Link>

        <div className="mt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Team Settings
          </div>
          <h2
            id="team-settings-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {team.name}
          </h2>
          <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-ink-400">
            Manage roles, permissions, members, and configuration for your team.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2 rounded-2xl border border-border-strong bg-white/[0.02] p-2 shadow-card backdrop-blur-xl">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-accent text-white shadow-glow-sm"
                    : "text-ink-400 hover:bg-white/[0.04] hover:text-ink-50"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          {activeTab === "overview" ? <SettingsOverviewTab {...props} /> : null}
          {activeTab === "members" ? <SettingsMembersTab {...props} /> : null}
          {activeTab === "roles" ? <SettingsRolesTab {...props} /> : null}
          {activeTab === "invitations" ? <SettingsInvitationsTab {...props} /> : null}
          {activeTab === "danger" ? <SettingsDangerTab {...props} /> : null}
        </div>
      </div>
    </section>
  );
}
