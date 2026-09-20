"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, User, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publishCourse } from "@/actions/academy-courses.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import type { CoursePublisherTeam } from "@/lib/validations/course.schema";
import { cn } from "@/lib/utils";

interface PublishCourseDialogProps {
  courseTitle: string;
  courseId: string;
  /** Whether the caller may publish individually (course manager). */
  canManage: boolean;
  /** Server-authoritative teams the caller may publish on behalf of. */
  coursePublisherTeams: CoursePublisherTeam[];
}

/**
 * Publisher selection for explicitly publishing a course. Options are
 * server-derived: individual publishing (when a course manager) plus the
 * teams returned by get_manageable_course_publisher_teams(). The chosen
 * context is sent to publishCourse, which re-validates everything in the DB.
 */
export function PublishCourseDialog({
  courseTitle,
  courseId,
  canManage,
  coursePublisherTeams,
}: PublishCourseDialogProps) {
  const router = useRouter();
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selection, setSelection] = useState<string>("me");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  const selectedTeam = coursePublisherTeams.find((team) => team.team_id === selection) ?? null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", courseId);
      if (selection !== "me") fd.set("publisher_team_id", selection);

      const result = await publishCourse(fd);

      if (result && "error" in result && result.error) {
        setError(result.error);
        router.refresh();
        return;
      }

      setOpen(false);
      toast.success("Course published.");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Publish course"
        className="inline-flex h-8 items-center rounded-full border border-emerald-500/40 px-3 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10"
      >
        Publish
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Publish course"
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={() => setOpen(false)}
              />

              <div
                ref={dialogFocusRef}
                tabIndex={-1}
                className="relative z-10 flex max-h-[85vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-8">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Publish course</h2>
                    <p className="mt-1 text-sm text-ink-400">{courseTitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-sm text-ink-400">
                      Choose who publishes this course to the Academy catalog.
                    </p>

                    <div className="space-y-3">
                      {canManage ? (
                        <button
                          type="button"
                          aria-pressed={selection === "me"}
                          onClick={() => setSelection("me")}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ease-premium cursor-pointer",
                            selection === "me"
                              ? "border-accent-400/60 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(109,109,255,0.2)]"
                              : "border-border-strong bg-surface text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                          )}
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent-400/50 bg-accent/10 text-accent-300">
                            <User size={15} />
                          </span>
                          <span>
                            <span className="block text-sm font-medium text-ink-50">
                              Publish as me
                            </span>
                            <span className="block text-xs text-ink-500">
                              Individually, as an Azenion course manager
                            </span>
                          </span>
                        </button>
                      ) : null}

                      {coursePublisherTeams.map((team) => (
                        <button
                          key={team.team_id}
                          type="button"
                          aria-pressed={selection === team.team_id}
                          onClick={() => setSelection(team.team_id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ease-premium cursor-pointer",
                            selection === team.team_id
                              ? "border-accent-400/60 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(109,109,255,0.2)]"
                              : "border-border-strong bg-surface text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                          )}
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface text-ink-300">
                            <Building2 size={15} />
                          </span>
                          <span>
                            <span className="block text-sm font-medium text-ink-50">
                              {team.name}
                            </span>
                            <span className="block text-xs text-ink-500">
                              On behalf of your team
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>

                    {!canManage && coursePublisherTeams.length === 0 ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                        Your team needs the Course Publisher capability enabled
                        and a role that includes publishing courses.
                      </div>
                    ) : null}

                    {selectedTeam ? (
                      <p className="text-xs text-ink-500">
                        Publishing on behalf of {selectedTeam.name} makes the team
                        visible as the course&apos;s publisher.
                      </p>
                    ) : null}

                    <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isPending || (!canManage && coursePublisherTeams.length === 0)}
                      >
                        <Send size={14} />
                        {isPending ? "Publishing..." : "Publish"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}