"use client";

import { Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RecruitmentRole {
  id: string;
  title: string;
  experience: "beginner" | "intermediate" | "advanced";
  positions: number;
  description: string;
}

interface RecruitmentEditorProps {
  roles: RecruitmentRole[];
  onChange: (roles: RecruitmentRole[]) => void;
  disabled?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3 text-[0.9rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

function newRole(): RecruitmentRole {
  return {
    id: crypto.randomUUID(),
    title: "",
    experience: "intermediate",
    positions: 1,
    description: "",
  };
}

export function RecruitmentEditor({ roles, onChange, disabled }: RecruitmentEditorProps) {
  function updateRole(index: number, field: keyof RecruitmentRole, value: string | number) {
    const next = roles.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    onChange(next);
  }

  function removeRole(index: number) {
    onChange(roles.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {roles.map((role, i) => (
        <div
          key={role.id}
          className="rounded-xl border border-border-strong/[0.08] bg-surface p-5 transition-all duration-300"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="mt-1 shrink-0 text-ink-600" />
              <span className="text-sm font-medium text-ink-300">Role {i + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeRole(i)}
              disabled={disabled}
              className="rounded p-1 text-ink-500 transition-colors hover:bg-surface-hover hover:text-red-400 disabled:opacity-40"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-ink-400">Role</label>
              <input
                value={role.title}
                onChange={(e) => updateRole(i, "title", e.target.value)}
                placeholder="e.g. Frontend Developer"
                disabled={disabled}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Experience</label>
              <select
                value={role.experience}
                onChange={(e) => updateRole(i, "experience", e.target.value)}
                disabled={disabled}
                className={`${inputClass} appearance-none`}
              >
                <option value="beginner" className="bg-void-950">Beginner</option>
                <option value="intermediate" className="bg-void-950">Intermediate</option>
                <option value="advanced" className="bg-void-950">Advanced</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Open positions</label>
              <input
                type="number"
                min={1}
                value={role.positions}
                onChange={(e) => updateRole(i, "positions", Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={disabled}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-ink-400">Description</label>
              <textarea
                value={role.description}
                onChange={(e) => updateRole(i, "description", e.target.value)}
                placeholder="Describe what you're looking for..."
                rows={2}
                disabled={disabled}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...roles, newRole()])}
        disabled={disabled}
      >
        <Plus size={14} />
        Add another role
      </Button>
    </div>
  );
}
