"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
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
  Building2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialogFocus, useDialogOpen } from "@/lib/use-dialog-focus";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { useTranslation } from "@/components/translation/translation-provider";
import { CourseCreateDialog } from "./course-create-dialog";
import { CourseEditDialog } from "./course-edit-dialog";
import { PublishCourseDialog } from "./publish-course-dialog";
import {
  deleteCourse,
  unpublishCourse,
  updateCourseStatus,
} from "@/actions/academy-courses.actions";
import type { CoursePublisherTeam, CourseRow } from "@/lib/validations/course.schema";

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
  canCreate: boolean;
  coursePublisherTeams: CoursePublisherTeam[];
}

export function CoursesBrowser({
  courses,
  canManage,
  canCreate,
  coursePublisherTeams,
}: CoursesBrowserProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [previewCourse, setPreviewCourse] = useState<CourseRow | null>(null);

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
                placeholder={t("academy.searchCourses")}
                aria-label={t("academy.searchCourses")}
                className={cn(inputClass, "pl-12")}
              />
            </div>
            {canCreate ? <CourseCreateDialog /> : null}
          </div>
        

        
          <div className="mt-6 flex justify-center">
            <FilterBubbles
              options={CATEGORIES.map((c) => ({ id: c, label: c }))}
              selected={category}
              onSelect={setCategory}
            />
          </div>
        

        
          {filtered.length > 0 ? (
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  canManage={canManage}
                  coursePublisherTeams={coursePublisherTeams}
                  onOpen={() => setPreviewCourse(course)}
                />
              ))}
            </div>
          ) : (
            <div className="relative mt-14 overflow-hidden rounded-lg card-surface-soft">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,245,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,245,248,0.04)_1px,transparent_1px)] bg-[size:32px_32px]"
              />
              <div className="relative flex flex-col items-center px-8 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface text-accent-300">
                  <GraduationCap size={32} />
                </div>
                <h3
                  id="courses-browser-heading"
                  className="mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl"
                >
                  {courses.length === 0
                    ? t("academy.listCoursesNone")
                    : t("academy.listCoursesEmpty")}
                </h3>
                <p className="mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
                  {courses.length === 0
                    ? t("academy.listCoursesNoneSub")
                    : t("academy.listCoursesEmptySub")}
                </p>
                {courses.length === 0 ? (
                  <p className="mt-8 text-xs font-semibold uppercase tracking-normal text-ink-600">
                    {t("academy.comingTo")}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        
        {previewCourse ? (
          <CoursePreviewDialog
            course={previewCourse}
            onClose={() => setPreviewCourse(null)}
          />
        ) : null}
      </div>
    </section>
  );
}

function canPublishCourseTeam(
  course: CourseRow,
  coursePublisherTeams: CoursePublisherTeam[],
): boolean {
  return course.publisher_team_id != null
    && coursePublisherTeams.some((team) => team.team_id === course.publisher_team_id);
}

function CoursePreviewDialog({
  course,
  onClose,
}: {
  course: CourseRow;
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true);
  useDialogOpen(true, onClose);
  const isHtml = course.content_type === "html_css";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-void-950/80 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-preview-title"
    >
      <button
        type="button"
        aria-label="Close course preview"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex h-[min(90vh,900px)] w-[min(1180px,100%)] flex-col overflow-hidden rounded-xl border border-border-strong bg-void-950 shadow-dialog focus:outline-none"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="course-preview-title" className="truncate text-sm font-semibold text-ink-50">
              {course.title}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {isHtml ? "HTML / CSS / JavaScript preview" : "Course document preview"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close course preview"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors duration-200 hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          >
            <X size={18} />
          </button>
        </header>
        <iframe
          title={`${course.title} preview`}
          src={`/api/academy/courses/${course.id}/file?view=preview`}
          sandbox={isHtml ? "allow-scripts" : undefined}
          className="min-h-0 flex-1 border-0 bg-white"
        />
      </div>
    </div>
  );
}

function CourseCard({
  course,
  canManage,
  coursePublisherTeams,
  onOpen,
}: {
  course: CourseRow;
  canManage: boolean;
  coursePublisherTeams: CoursePublisherTeam[];
  onOpen: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const isPdf = course.content_type === "pdf";
  const Icon = isPdf ? FileText : Code2;
  const isPublished = course.status === "published";

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
      toast.success(t("academy.courseDeleted"));
      router.refresh();
    });
  }

  function handleArchive() {
    startStatusTransition(async () => {
      const fd = new FormData();
      fd.set("id", course.id);
      fd.set("status", course.status === "archived" ? "draft" : "archived");
      const result = await updateCourseStatus(fd);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(course.status === "archived" ? "Course unarchived." : "Course archived.");
      router.refresh();
    });
  }

  function handleUnpublish() {
    startStatusTransition(async () => {
      const fd = new FormData();
      fd.set("id", course.id);
      const result = await unpublishCourse(fd);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Course unpublished (draft).");
      router.refresh();
    });
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg card-surface-soft transition-colors duration-200 ease-out hover:border-accent-400/40">
      <div className="relative flex flex-1 flex-col p-6">
        {course.thumbnail ? (
          <button
            type="button"
            onClick={onOpen}
            className="relative -mx-6 -mt-6 mb-5 block overflow-hidden border-b border-border text-left transition-opacity duration-200 hover:opacity-90"
          >
            <Image
              src={`/api/academy/courses/${course.id}/file?view=thumbnail`}
              alt={`${course.title} thumbnail`}
              width={640}
              height={160}
              sizes="(max-width: 768px) 100vw, 640px"
              className="h-40 w-full object-cover"
              unoptimized
            />
          </button>
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
          <div className="flex items-center gap-2">
            {canManage ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                  isPublished
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : course.status === "archived"
                      ? "border-ink-500/30 bg-surface text-ink-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                )}
                title={isPublished ? "Visible to everyone" : "Hidden from regular users"}
              >
                {course.status ?? "draft"}
              </span>
            ) : null}
            {canManage ? <CourseEditDialog course={course} /> : null}
          </div>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-ink-50">{course.title}</h3>

        {course.publisher_team ? (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Building2 size={12} className="text-ink-600" />
            Published by <span className="font-medium text-ink-300">{course.publisher_team.name}</span>
          </p>
        ) : course.publisher_profile ? (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <User size={12} className="text-ink-600" />
            Published by{" "}
            <span className="font-medium text-ink-300">
              {course.publisher_profile.full_name || `@${course.publisher_profile.username}`}
            </span>
          </p>
        ) : null}

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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <span className="rounded-full border border-accent/25 bg-accent/[0.06] px-2.5 py-1 text-xs font-medium text-accent-300">
            {course.category}
          </span>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {canManage && !isPublished ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={statusPending}
                title={
                  course.status === "archived"
                    ? "Unarchive (restore as draft)"
                    : "Archive (managers only)"
                }
                className="inline-flex h-8 items-center rounded-full border border-ink-500/40 px-3 text-xs font-medium text-ink-400 transition-colors hover:bg-surface-hover"
              >
                {course.status === "archived" ? "Unarchive" : "Archive"}
              </button>
            ) : null}
            {!isPublished && (canManage || coursePublisherTeams.length > 0) ? (
              <PublishCourseDialog
                courseTitle={course.title}
                courseId={course.id}
                canManage={canManage}
                coursePublisherTeams={coursePublisherTeams}
              />
            ) : null}
            {isPublished && (canManage || canPublishCourseTeam(course, coursePublisherTeams)) ? (
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={statusPending}
                title="Unpublish (make draft)"
                className="inline-flex h-8 items-center rounded-full border border-amber-500/40 px-3 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
              >
                {statusPending ? "..." : "Unpublish"}
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                aria-label={t("academy.deleteCourseAria")}
                title={confirming ? t("academy.clickAgain") : t("academy.deleteCourseAria")}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
                  confirming
                    ? "border-red-500/50 bg-red-500/10 text-red-300"
                    : "border-border-strong text-ink-400 hover:border-red-500/50 hover:text-red-300"
                )}
              >
                <Trash2 size={13} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-500"
            >
              {t("academy.open")}
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
