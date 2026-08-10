"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, ChevronDown, MapPin, Shuffle, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSessionRequest } from "@/actions/session-request.actions";
import { SESSION_REQUEST_FORMATS } from "@/lib/validations/session-request.schema";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { cn } from "@/lib/utils";

export interface BranchOption {
  id: string;
  name: string;
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const selectClass = `${inputClass} cursor-pointer appearance-none pr-10`;

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

const FORMAT_OPTIONS: {
  value: (typeof SESSION_REQUEST_FORMATS)[number];
  label: string;
  description: string;
  icon: typeof Video;
}[] = [
  { value: "ONLINE", label: "Online", description: "Virtual session", icon: Video },
  { value: "IN_PERSON", label: "In-person", description: "On-campus session", icon: MapPin },
  { value: "EITHER", label: "Either", description: "No preference", icon: Shuffle },
];

export function RequestSessionDialog({ branches }: { branches: BranchOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<(typeof SESSION_REQUEST_FORMATS)[number]>("EITHER");
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setFormat("EITHER");
    setBranchId("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("description", description);
      fd.set("preferred_format", format);
      fd.set("preferred_branch_id", branchId);

      const result = await createSessionRequest(fd);

      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      resetForm();
      toast.success("Your request has been submitted.");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="primary" size="lg" onClick={() => setOpen(true)}>
        <CalendarPlus size={17} />
        Request a Session
      </Button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Request a session"
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
                className="relative z-10 flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Request a Session</h2>
                    <p className="mt-1 text-sm text-ink-400">
                      Tell us what you want to learn. Our team will review it and schedule a live
                      session.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="session-title" className={labelClass}>
                        Session title
                      </label>
                      <input
                        id="session-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={200}
                        placeholder="e.g. Intro to Web Development"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="session-description" className={labelClass}>
                        Description
                      </label>
                      <textarea
                        id="session-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        maxLength={5000}
                        rows={4}
                        placeholder="What do you want to cover? Who is it for?"
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">{description.length}/5000</p>
                    </div>

                    <fieldset>
                      <legend className={labelClass}>Preferred format</legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {FORMAT_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const selected = format === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setFormat(option.value)}
                              className={cn(
                                "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ease-premium cursor-pointer",
                                selected
                                  ? "border-accent-400/60 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(109,109,255,0.2)]"
                                  : "border-border-strong text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                  selected
                                    ? "border-accent-400/50 bg-accent/10 text-accent-300"
                                    : "border-border-strong bg-surface text-ink-400"
                                )}
                              >
                                <Icon size={15} />
                              </span>
                              <span>
                                <span className="block text-sm font-medium text-ink-50">
                                  {option.label}
                                </span>
                                <span className="block text-xs text-ink-500">
                                  {option.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="session-branch" className={labelClass}>
                        Preferred branch <span className="text-ink-600">(optional)</span>
                      </label>
                      <div className="relative">
                        <select
                          id="session-branch"
                          value={branchId}
                          onChange={(e) => setBranchId(e.target.value)}
                          className={selectClass}
                        >
                          <option value="">Any branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setOpen(false);
                          resetForm();
                        }}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                        {isPending ? "Submitting..." : "Submit Request"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
