"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

const TECHNOLOGIES = ["All", "Next.js", "TypeScript", "Tailwind CSS", "React Native", "Expo", "Supabase", "PostgreSQL"];
const STATUSES = ["All", "Active", "Planning", "Concept", "In Development"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

interface DropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

function Dropdown({ label, options, value, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border-strong bg-white/[0.03] px-4 py-2.5 text-sm text-ink-200 backdrop-blur-xl transition-all duration-300 hover:border-accent-400/40 sm:w-auto"
      >
        <span>{value === "All" ? label : value}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full min-w-[160px] overflow-hidden rounded-xl border border-border-strong bg-[#0e1016] shadow-xl backdrop-blur-xl">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors duration-200 hover:bg-accent/[0.08] hover:text-accent-300 ${
                value === option ? "text-accent-400" : "text-ink-400"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchFilters() {
  const [search, setSearch] = useState("");
  const [tech, setTech] = useState("All");
  const [status, setStatus] = useState("All");
  const [difficulty, setDifficulty] = useState("All");

  return (
    <section className="relative py-12 sm:py-16 lg:py-20" aria-label="Search and filter projects">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/8 blur-[100px]" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-600"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-xl border border-border-strong bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-ink-50 placeholder:text-ink-600 backdrop-blur-xl transition-all duration-300 hover:border-accent-400/40 focus:border-accent-400/60 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Dropdown label="Technology" options={TECHNOLOGIES} value={tech} onChange={setTech} />
              <Dropdown label="Status" options={STATUSES} value={status} onChange={setStatus} />
              <Dropdown label="Difficulty" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
