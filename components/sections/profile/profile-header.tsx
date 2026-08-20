import { Calendar, GraduationCap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarUpload } from "./avatar-upload";
import { EditProfileDialog } from "./edit-profile-dialog";
import { formatDate } from "@/lib/date";

interface ProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    skills: string[];
    institution: string | null;
    created_at: string;
  };
  branch: { name: string; slug: string } | null;
  cardClass: string;
}

export function ProfileHeader({ profile, branch, cardClass }: ProfileHeaderProps) {
  const displayName = profile.full_name.trim() || "Add your name";
  const displayUsername = profile.username.trim()
    ? `@${profile.username}`
    : "Set a username";

  return (
    <div className={cardClass}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <AvatarUpload
            avatarUrl={profile.avatar_url}
            userId={profile.id}
            username={profile.username}
          />

          <div className="space-y-2">
            <div>
              <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">
                {displayName}
              </h1>
              <p className="text-sm text-ink-400">{displayUsername}</p>
            </div>

            {profile.bio ? (
              <p className="max-w-xl text-sm leading-relaxed text-ink-200">
                {profile.bio}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-400">
              {profile.institution ? (
                <Badge className="border-ink-500/30 bg-ink-500/10 text-ink-300 h-5 px-2.5 py-0 gap-1.5">
                  <GraduationCap className="h-3 w-3" />
                  {profile.institution}
                </Badge>
              ) : null}
              {branch ? (
                <Badge className="border-ink-500/30 bg-ink-500/10 text-ink-300 h-5 px-2.5 py-0 gap-1.5">
                  <Users className="h-3 w-3" />
                  {branch.name}
                </Badge>
              ) : null}
              <Badge className="border-ink-500/30 bg-ink-500/10 text-ink-300 h-5 px-2.5 py-0 gap-1.5">
                <Calendar className="h-3 w-3" />
                Member since {formatDate(profile.created_at)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <EditProfileDialog
            profile={{
              id: profile.id,
              full_name: profile.full_name,
              username: profile.username,
              bio: profile.bio,
              avatar_url: profile.avatar_url,
              institution: profile.institution,
              skills: profile.skills,
              github_url: profile.github_url,
              linkedin_url: profile.linkedin_url,
            }}
            branch={branch}
          />
        </div>
      </div>
    </div>
  );
}
