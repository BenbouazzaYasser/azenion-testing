import { Users, Star, Shield, GitPullRequest } from "lucide-react";
import { serverT } from "@/lib/translation/server";

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

export async function ProjectPageMembers({ members }: ProjectPageMembersProps) {
  if (members.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-members-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
            {await serverT("projects.peopleEyebrow")}
          </div>
        

        
          <h2
            id="project-members-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {await serverT("projects.membersTitle")}
            <span className="ml-3 text-lg font-normal text-ink-500">({members.length})</span>
          </h2>
        

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(await Promise.all(members.map(async (member, i) => {
            const profile = member.profile;
            const displayName = profile.full_name || `@${profile.username}`;
            const initials = displayName.charAt(0).toUpperCase();

            return (
              
                <div key={profile.id} className="group relative flex h-full flex-col overflow-hidden rounded-2xl card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col items-center p-8 text-center sm:p-9">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-16 w-16 rounded-xl border border-accent-400/30 object-cover transition-all duration-500 ease-premium group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-xl font-semibold text-accent-400 transition-all duration-500 ease-premium group-hover:scale-[1.05]">
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
                        {member.role === "owner" ? await serverT("common.owner") : member.role === "admin" ? await serverT("common.admin") : member.role}
                      </span>
                    </div>
                  </div>
                </div>
              
            );
          })))}
        </div>
      </div>
    </section>
  );
}
