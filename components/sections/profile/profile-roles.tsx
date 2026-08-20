import { ShieldCheck } from "lucide-react";

interface ProfileRolesProps {
  roles: string[];
  cardClass: string;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ProfileRoles({ roles, cardClass }: ProfileRolesProps) {
  if (roles.length === 0) return null;

  return (
    <div className={cardClass}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
        Roles
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {roles.map((role) => (
          <span
            key={role}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/25 bg-accent/[0.08] px-3 py-1.5 text-xs font-medium text-accent-200"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {formatRole(role)}
          </span>
        ))}
      </div>
    </div>
  );
}
