"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, UserRoundPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RevokeRoleConfirmModal } from "@/components/admin/revoke-role-confirm-modal";
import {
  adminSearchUsers,
  adminGetUserRoles,
  adminGrantRole,
  type AdminUserSearchResult,
  type AdminUserRole,
} from "@/actions/admin-roles.actions";

interface RoleCatalogEntry {
  name: string;
  description: string | null;
}

interface RoleManagerProps {
  roleCatalog: RoleCatalogEntry[];
}

export function RoleManager({ roleCatalog }: RoleManagerProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserSearchResult | null>(null);
  const [userRoles, setUserRoles] = useState<AdminUserRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [grantRole, setGrantRole] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isGranting, startGrant] = useTransition();
  const [, startRoles] = useTransition();
  const searchSeq = useRef(0);

  function runSearch(nextQuery: string) {
    const seq = ++searchSeq.current;
    startSearch(async () => {
      const result = await adminSearchUsers({ query: nextQuery });
      if (seq !== searchSeq.current) return;
      if (result.error !== null) {
        setSearchError(result.error);
        setUsers([]);
        return;
      }
      setSearchError(null);
      setUsers(result.users);
    });
  }

  // Initial listing so the GUI is usable without typing a query first.
  useEffect(() => {
    runSearch("");
    return () => {
      searchSeq.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(user: AdminUserSearchResult) {
    setSelected(user);
    setUserRoles([]);
    setGrantRole("");
    setRolesLoading(true);

    startRoles(async () => {
      const result = await adminGetUserRoles({ user_id: user.id });
      if (result.error !== null) {
        toast.error(result.error);
        setRolesLoading(false);
        return;
      }
      setUserRoles(result.roles);
      setRolesLoading(false);
    });
  }

  const heldNames = new Set(userRoles.map((r) => r.name));
  const grantable = roleCatalog.filter((r) => !heldNames.has(r.name));

  function handleGrant() {
    if (!selected || !grantRole) return;
    const roleName = grantRole;

    startGrant(async () => {
      const result = await adminGrantRole({
        user_id: selected.id,
        role_name: roleName,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Role "${roleName}" granted.`);
      setGrantRole("");
      startRoles(async () => {
        const refreshed = await adminGetUserRoles({ user_id: selected.id });
        if (refreshed.error === null) setUserRoles(refreshed.roles);
      });
    });
  }

  const catalogByName = new Map(roleCatalog.map((r) => [r.name, r]));

  return (
    <div className="space-y-6">
      {/* ── User search ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border-strong/[0.08] bg-surface shadow-card backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="Search members by username or name…"
            aria-label="Search users"
            className="flex-1 rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover"
          />
          <Button type="submit" size="sm" disabled={isSearching}>
            <Search size={14} />
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </form>

        {searchError ? (
          <p className="px-5 pb-5 text-sm text-red-400 sm:px-6">{searchError}</p>
        ) : users.length === 0 && !isSearching ? (
          <p className="px-5 pb-5 text-sm text-ink-500 sm:px-6">No members found.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(u)}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-hover sm:px-6 ${
                    selected?.id === u.id ? "bg-surface-hover" : ""
                  }`}
                >
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border border-accent-400/30 object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-400 text-xs font-semibold text-white">
                      {(u.full_name || u.username || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-50">
                      {u.full_name || u.username}
                    </span>
                    <span className="block truncate text-xs text-ink-500">
                      @{u.username}
                      {u.institution ? ` · ${u.institution}` : ""}
                    </span>
                  </span>
                  {selected?.id === u.id ? (
                    <span className="text-xs font-medium text-accent-400">Selected</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Selected member ─────────────────────────────────────────── */}
      {selected ? (
        <section className="rounded-2xl border border-border-strong/[0.08] bg-surface shadow-card backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
            {selected.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.avatar_url}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full border border-accent-400/30 object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-400 text-sm font-semibold text-white">
                {(selected.full_name || selected.username || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[0.95rem] font-semibold text-ink-50">
                {selected.full_name || selected.username}
              </p>
              <p className="truncate text-xs text-ink-500">
                @{selected.username}
                {selected.institution ? ` · ${selected.institution}` : ""}
              </p>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {/* Current roles */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink-200">Current roles</h3>
              {rolesLoading ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : userRoles.length === 0 ? (
                <p className="text-sm text-ink-500">No platform roles assigned.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {userRoles.map((assignment) => {
                    const role = catalogByName.get(assignment.name);
                    return (
                      <li
                        key={assignment.name}
                        className="inline-flex items-center gap-2 rounded-full border border-border-strong/[0.08] bg-surface px-4 py-1.5 text-xs font-medium tracking-wide text-ink-200"
                        title={role?.description ?? undefined}
                      >
                        {assignment.name}
                        <span className="text-ink-600">
                          since{" "}
                          {new Date(assignment.assigned_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(assignment.name)}
                          aria-label={`Revoke ${assignment.name}`}
                          className="-mr-1 rounded-full p-0.5 text-ink-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <X size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Grant a role */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink-200">Grant a role</h3>
              {grantable.length === 0 ? (
                <p className="text-sm text-ink-500">
                  All catalogued roles are already assigned to this member.
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="admin-grant-role" className="sr-only">
                      Role
                    </label>
                    <select
                      id="admin-grant-role"
                      value={grantRole}
                      onChange={(e) => setGrantRole(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3 text-[0.95rem] text-ink-50 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover"
                    >
                      <option value="" disabled>
                        Select a role…
                      </option>
                      {grantable.map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.name}
                          {role.description ? ` — ${role.description}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleGrant}
                    disabled={!grantRole || isGranting}
                  >
                    <UserRoundPlus size={14} />
                    {isGranting ? "Granting…" : "Grant"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Revoke confirmation ─────────────────────────────────────── */}
      {selected && revokeTarget ? (
        <RevokeRoleConfirmModal
          open={revokeTarget !== null}
          onClose={() => setRevokeTarget(null)}
          onRevoked={() => {
            setUserRoles((prev) => prev.filter((r) => r.name !== revokeTarget));
          }}
          userId={selected.id}
          username={selected.username}
          roleName={revokeTarget}
        />
      ) : null}
    </div>
  );
}
