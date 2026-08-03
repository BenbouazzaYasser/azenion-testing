import { Users, Star, Shield, GitPullRequest } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

interface ProjectMemberWithProfile {
  role: string;
  joined_at: string | null;
  profile: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface ProjectPageMembersProps {
  members: ProjectMemberWithProfile[];
}

export function ProjectPageMembers({ members }: ProjectPageMembersProps) {
  if (members.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-members-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            People
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-members-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Members
            <span className="ml-3 text-lg font-normal text-ink-500">({members.length})</span>
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, i) => {
            const profile = member.profile;
            const displayName = profile.full_name || `@${profile.username}`;
            const initials = displayName.charAt(0).toUpperCase();

            return (
              <Reveal key={profile.id} delay={i * 80}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col items-center p-8 text-center sm:p-9">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-16 w-16 rounded-xl border border-accent-400/30 object-cover transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-xl font-semibold text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm">
                        {initials}
                      </div>
                    )}

                    <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {displayName}
                    </h3>

                    <div className="mt-3 flex items-center gap-2 text-sm">
                      {member.role === "owner" ? (
                        <Star size={13} className="shrink-0 text-amber-400" />
                      ) : member.role === "admin" ? (
                        <Shield size={13} className="shrink-0 text-accent-400" />
                      ) : (
                        <GitPullRequest size={13} className="shrink-0 text-blue-400" />
                      )}
                      <span className={`capitalize ${
                        member.role === "owner" ? "text-amber-300" :
                        member.role === "admin" ? "text-accent-300" :
                        "text-blue-300"
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
