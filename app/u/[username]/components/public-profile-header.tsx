import { Calendar, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";

interface PublicProfileHeaderProps {
  profile: {
    username: string;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    skills: string[];
    institution: string | null;
    created_at: string;
  };
  cardClass: string;
}

export function PublicProfileHeader({ profile, cardClass }: PublicProfileHeaderProps) {
  const displayName = profile.full_name.trim() || profile.username;
  const displayUsername = profile.username.trim() ? `@${profile.username}` : "";

  return (
    <div className={cardClass}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent-400/30 bg-accent/[0.08] sm:h-28 sm:w-28">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold text-ink-400">
              {profile.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">{displayName}</h1>
            {displayUsername ? <p className="text-sm text-ink-400">{displayUsername}</p> : null}
          </div>

          {profile.bio ? (
            <p className="max-w-xl text-sm leading-relaxed text-ink-200">{profile.bio}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-400">
            {profile.institution ? (
              <Badge className="border-ink-500/30 bg-ink-500/10 text-ink-300 h-5 px-2.5 py-0 gap-1.5">
                <GraduationCap className="h-3 w-3" />
                {profile.institution}
              </Badge>
            ) : null}
            <Badge className="border-ink-500/30 bg-ink-500/10 text-ink-300 h-5 px-2.5 py-0 gap-1.5">
              <Calendar className="h-3 w-3" />
              Member since {formatDate(profile.created_at)}
            </Badge>
          </div>

          {profile.skills.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-accent-400/20 bg-accent/[0.06] px-3 py-1 text-xs font-medium text-accent-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}