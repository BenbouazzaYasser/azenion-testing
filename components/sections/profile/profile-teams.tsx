import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";

interface UserTeam {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  role: string;
}

interface ProfileTeamsProps {
  teams: UserTeam[];
  cardClass: string;
}

export function ProfileTeams({ teams, cardClass }: ProfileTeamsProps) {
  if (teams.length === 0) return null;

  return (
    <div className={cardClass}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
        Teams
      </h2>

      <div className="mt-4 space-y-3">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border-strong bg-white/[0.02] px-4 py-3 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.04]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border border-accent-400/30 bg-accent/[0.08] p-2">
              {team.logo_url ? (
                <img src={team.logo_url} alt="" className="h-full w-full rounded object-cover" />
              ) : (
                <Users size={16} className="text-accent-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-50 transition-colors group-hover:text-accent-400">
                {team.name}
              </p>
              <p className="text-xs capitalize text-ink-500">
                {team.role}
              </p>
            </div>
            <ArrowUpRight
              size={14}
              className="shrink-0 text-ink-600 transition-all duration-300 group-hover:text-accent-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
