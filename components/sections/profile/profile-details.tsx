import { Github, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileRow {
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
  updated_at: string;
}

interface ProfileDetailsProps {
  profile: ProfileRow | null;
  cardClass: string;
}

function stripProtocol(url: string) {
  return url.replace(/^https?:\/\//, "");
}

export function ProfileDetails({ profile, cardClass }: ProfileDetailsProps) {
  const skills = profile?.skills ?? [];
  const githubUrl = profile?.github_url ?? null;
  const linkedinUrl = profile?.linkedin_url ?? null;

  return (
    <div className="space-y-4">
      <div className={cardClass}>
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
          Skills
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.length > 0 ? (
            skills.map((skill) => <Badge key={skill}>{skill}</Badge>)
          ) : (
            <p className="text-sm text-ink-400">No skills added yet</p>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
          Social Links
        </h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Github className="h-4 w-4 shrink-0 text-accent-400" />
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="truncate text-ink-200 transition-colors hover:text-ink-50"
              >
                {stripProtocol(githubUrl)}
              </a>
            ) : (
              <span className="text-ink-400">Not connected</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Linkedin className="h-4 w-4 shrink-0 text-accent-400" />
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="truncate text-ink-200 transition-colors hover:text-ink-50"
              >
                {stripProtocol(linkedinUrl)}
              </a>
            ) : (
              <span className="text-ink-400">Not connected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
