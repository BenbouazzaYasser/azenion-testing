"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  GraduationCap,
  FileText,
  Code2,
  Trash2,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { CourseCreateDialog } from "./course-create-dialog";
import { CourseEditDialog } from "./course-edit-dialog";
import { deleteCourse } from "@/actions/academy-courses.actions";
import type { CourseRow } from "@/lib/validations/course.schema";

const CATEGORIES = [
  "Programming",
  "Engineering",
  "AI",
  "Mathematics",
  "Cybersecurity",
  "Design",
  "Data Science",
  "Cloud Computing",
  "Mobile Development",
  "Business",
  "Marketing",
  "DevOps",
  "Web Development",
  "Blockchain",
  "Networking",
  "Databases",
  "Game Development",
  "Robotics",
  "IoT",
  "Embedded Systems",
  "Machine Learning",
  "Big Data",
  "Operating Systems",
  "System Administration",
  "Software Testing",
  "AR/VR",
  "Quantum Computing",
  "Edge Computing",
  "Computer Architecture",
  "Computer Science",
  "Information Systems",
  "Software Architecture",
];

const inputClass =
  "w-full rounded-full bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 shadow-card outline-none backdrop-blur-xl transition-[border-color,box-shadow] duration-200 focus:border-accent-400/60 focus:ring-2 focus:ring-accent-400/30";

interface CoursesBrowserProps {
  courses: CourseRow[];
  canManage: boolean;
}

export function CoursesBrowser({ courses, canManage }: CoursesBrowserProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesCategory = !category || course.category === category;
      const matchesQuery =
        !q ||
        course.title.toLowerCase().includes(q) ||
        (course.description ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [courses, query, category]);

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="courses-browser-heading">
      <div className="mx-auto max-w-[880px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses..."
                aria-label="Search courses"
                className={cn(inputClass, "pl-12")}
              />
            </div>
            {canManage ? <CourseCreateDialog /> : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex justify-center">
            <FilterBubbles
              options={CATEGORIES.map((c) => ({ id: c, label: c }))}
              selected={category}
              onSelect={setCategory}
            />
          </div>
        </Reveal>

        <Reveal delay={160}>
          {filtered.length > 0 ? (
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {filtered.map((course) => (
                <CourseCard key={course.id} course={course} canManage={canManage} />
              ))}
            </div>
          ) : (
            <div className="relative mt-14 overflow-hidden rounded-2xl card-surface-soft shadow-card backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,245,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,245,248,0.04)_1px,transparent_1px)] bg-[size:32px_32px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
              />

              <div className="relative flex flex-col items-center px-8 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                  <GraduationCap size={32} />
                </div>
                <h3
                  id="courses-browser-heading"
                  className="mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl"
                >
                  {courses.length === 0
                    ? "No courses available yet"
                    : "No courses match your search"}
                </h3>
                <p className="mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
                  {courses.length === 0
                    ? "Courses are currently being prepared. Check back soon."
                    : "Try a different search term or category."}
                </p>
                {courses.length === 0 ? (
                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">
                    Coming to Azenion Academy
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function CourseCard({
  course,
  canManage,
}: {
  course: CourseRow;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const isPdf = course.content_type === "pdf";
  const Icon = isPdf ? FileText : Code2;

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", course.id);
      const result = await deleteCourse(fd);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success("Course deleted");
      router.refresh();
    });
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl card-surface-soft shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/10 blur-[100px] transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex flex-1 flex-col p-6">
        {course.thumbnail ? (
          <div className="relative -mx-6 -mt-6 mb-5 overflow-hidden border-b border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.thumbnail}
              alt={`${course.title} thumbnail`}
              className="h-40 w-full object-cover"
            />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border",
              isPdf
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-accent-400/30 bg-accent/10 text-accent-300"
            )}
          >
            <Icon size={20} />
          </span>
          {canManage ? <CourseEditDialog course={course} /> : null}
        </div>

        <h3 className="mt-4 text-lg font-semibold text-ink-50">{course.title}</h3>

        {(course.duration || course.difficulty) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {course.duration ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-400">
                <Clock size={11} />
                {course.duration}
              </span>
            ) : null}
            {course.difficulty ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                  course.difficulty === "beginner"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : course.difficulty === "intermediate"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                )}
              >
                {course.difficulty}
              </span>
            ) : null}
          </div>
        )}

        {course.description ? (
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-400">
            {course.description}
          </p>
        ) : null}

        {course.tags && course.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {course.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-ink-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="rounded-full border border-accent/25 bg-accent/[0.06] px-2.5 py-1 text-xs font-medium text-accent-300">
            {course.category}
          </span>

          <div className="flex items-center gap-2">
            {canManage ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                aria-label="Delete course"
                title={confirming ? "Click again to confirm" : "Delete course"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                  confirming
                    ? "border-red-500/50 bg-red-500/10 text-red-300"
                    : "border-border-strong text-ink-400 hover:border-red-500/50 hover:text-red-300"
                )}
              >
                <Trash2 size={13} />
              </button>
            ) : null}
            <a
              href={isPdf ? course.file_url : `/api/academy/courses/${course.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-medium text-white transition-all duration-300 ease-premium hover:bg-accent-glow hover:shadow-glow"
            >
              Open
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}