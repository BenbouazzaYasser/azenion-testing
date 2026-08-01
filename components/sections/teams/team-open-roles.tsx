"use client";

import { useState, useTransition } from "react";
import { UserPlus, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { saveOpenRole, deleteOpenRole } from "@/actions/team.actions";

interface OpenRole {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
}

interface TeamOpenRolesProps {
  roles: OpenRole[];
  teamId: string;
  teamSlug: string;
  canManage: boolean;
}

function OpenRoleCard({
  role,
  teamId,
  teamSlug,
  canManage,
}: {
  role: OpenRole;
  teamId: string;
  teamSlug: string;
  canManage: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(role.title);
  const [description, setDescription] = useState(role.description ?? "");
  const [quantity, setQuantity] = useState(role.quantity);

  function handleSave() {
    const formData = new FormData();
    formData.set("id", role.id);
    formData.set("team_id", teamId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("quantity", String(quantity));
    formData.set("slug", teamSlug);

    startTransition(async () => {
      const result = await saveOpenRole(formData);
      if (!result.error) setIsEditing(false);
    });
  }

  function handleDelete() {
    const formData = new FormData();
    formData.set("role_id", role.id);
    formData.set("slug", teamSlug);

    startTransition(async () => {
      await deleteOpenRole(formData);
    });
  }

  const inputClass =
    "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(109,109,255,0.15)]";

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-accent-400/40 bg-accent/[0.04] p-6 sm:p-8">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-200">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-200">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-200">Quantity Needed</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min={1}
              max={100}
              className={inputClass}
            />
          </div>
          <div className="flex gap-3">
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow-sm">
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
              <UserPlus size={18} className="text-accent-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink-50">{role.title}</h3>
              <p className="text-sm text-ink-400">Need: {role.quantity}</p>
            </div>
          </div>

          {canManage ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDelete} disabled={isPending}>
                <X size={14} />
              </Button>
            </div>
          ) : null}
        </div>

        {role.description ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-400">{role.description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function TeamOpenRoles({ roles, teamId, teamSlug, canManage }: TeamOpenRolesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);

  function handleAdd() {
    const formData = new FormData();
    formData.set("team_id", teamId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("quantity", String(quantity));
    formData.set("slug", teamSlug);

    startTransition(async () => {
      const result = await saveOpenRole(formData);
      if (!result.error) {
        setIsAdding(false);
        setTitle("");
        setDescription("");
        setQuantity(1);
      }
    });
  }

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="team-open-roles-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.12),transparent_70%)]" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Recruiting
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex items-center justify-between">
            <h2
              id="team-open-roles-heading"
              className="text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              Open Roles
            </h2>
            {canManage ? (
              <Button size="sm" variant="secondary" onClick={() => setIsAdding(true)}>
                <Plus size={14} />
                Add Role
              </Button>
            ) : null}
          </div>
        </Reveal>

        <div className="mt-12 space-y-5">
          {isAdding ? (
            <div className="rounded-2xl border border-accent-400/40 bg-accent/[0.04] p-6 sm:p-8">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-200">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    required
                    placeholder="e.g. Frontend Developer"
                    className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-200">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="What are you looking for?"
                    className="w-full resize-none rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-200">Quantity Needed</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min={1}
                    max={100}
                    className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-sm text-ink-50 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06]"
                  />
                </div>
                <div className="flex gap-3">
                  <Button size="sm" onClick={handleAdd} disabled={isPending}>
                    {isPending ? "Adding..." : "Add Role"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setIsAdding(false)} disabled={isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {roles.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <UserPlus className="h-8 w-8 text-ink-600" />
              <p className="max-w-xs text-sm text-ink-400">
                No open roles yet. {canManage ? "Add roles your team is looking for." : "Check back later."}
              </p>
            </div>
          ) : (
            roles.map((role, i) => (
              <Reveal key={role.id} delay={i * 80}>
                <OpenRoleCard role={role} teamId={teamId} teamSlug={teamSlug} canManage={canManage} />
              </Reveal>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
