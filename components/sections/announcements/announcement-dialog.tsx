"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAnnouncement, updateAnnouncement } from "@/actions/announcements.actions";
import type { Announcement } from "@/data/announcements";

interface AnnouncementFormDialogProps {
  mode: "create" | "edit";
  announcement?: Announcement;
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(109,109,255,0.15)]";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

export function AnnouncementFormDialog({ mode, announcement }: AnnouncementFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  const [emoji, setEmoji] = useState(announcement?.emoji ?? "📢");
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [category, setCategory] = useState(announcement?.category ?? "Platform");
  const [badge, setBadge] = useState(announcement?.badge ?? "");
  const [description, setDescription] = useState(announcement?.description ?? "");
  const [details, setDetails] = useState(announcement?.details?.join("\n") ?? "");

  useEffect(() => {
    setEmoji(announcement?.emoji ?? "📢");
    setTitle(announcement?.title ?? "");
    setCategory(announcement?.category ?? "Platform");
    setBadge(announcement?.badge ?? "");
    setDescription(announcement?.description ?? "");
    setDetails(announcement?.details?.join("\n") ?? "");
  }, [announcement]);

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
    setEmoji(announcement?.emoji ?? "📢");
    setTitle(announcement?.title ?? "");
    setCategory(announcement?.category ?? "Platform");
    setBadge(announcement?.badge ?? "");
    setDescription(announcement?.description ?? "");
    setDetails(announcement?.details?.join("\n") ?? "");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      if (mode === "edit" && announcement) fd.set("id", announcement.id);
      fd.set("emoji", emoji);
      fd.set("title", title);
      fd.set("category", category);
      fd.set("badge", badge);
      fd.set("description", description);
      fd.set("details", details);

      const result =
        mode === "edit"
          ? await updateAnnouncement(fd)
          : await createAnnouncement(fd);

      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {mode === "create" ? (
        <Button variant="primary" size="default" onClick={() => setOpen(true)}>
          <Plus size={15} />
          Create Announcement
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Edit announcement"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-ink-400 transition-colors hover:border-accent-400/50 hover:text-accent-400"
        >
          <Pencil size={13} />
        </button>
      )}

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label={mode === "create" ? "Create announcement" : "Edit announcement"}
            >
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={() => setOpen(false)}
              />

              <div
                className="relative z-10 flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(20,20,28,0.98),rgba(8,8,12,0.98))] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_30px_80px_-20px_rgba(40,40,255,0.15)] backdrop-blur-2xl transition-all duration-200 ease-premium"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">
                      {mode === "create" ? "Create Announcement" : "Edit Announcement"}
                    </h2>
                    <p className="mt-1 text-sm text-ink-400">
                      {mode === "create"
                        ? "Publish a new update to the announcement board."
                        : "Update this announcement on the board."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-white/5 hover:text-ink-50"
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
                    <div className="grid gap-6 sm:grid-cols-[96px_1fr]">
                      <div>
                        <label htmlFor="announcement-emoji" className={labelClass}>
                          Emoji
                        </label>
                        <input
                          id="announcement-emoji"
                          value={emoji}
                          onChange={(e) => setEmoji(e.target.value)}
                          maxLength={16}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="announcement-title" className={labelClass}>
                          Title
                        </label>
                        <input
                          id="announcement-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                          maxLength={200}
                          placeholder="e.g. New Feature Release"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="announcement-category" className={labelClass}>
                          Category
                        </label>
                        <input
                          id="announcement-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          maxLength={80}
                          placeholder="e.g. Platform, Community, Development"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="announcement-badge" className={labelClass}>
                          Badge <span className="text-ink-600">(optional)</span>
                        </label>
                        <input
                          id="announcement-badge"
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          maxLength={40}
                          placeholder="e.g. Latest"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="announcement-description" className={labelClass}>
                        Description
                      </label>
                      <textarea
                        id="announcement-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        maxLength={5000}
                        rows={4}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">{description.length}/5000</p>
                    </div>

                    <div>
                      <label htmlFor="announcement-details" className={labelClass}>
                        Key points <span className="text-ink-600">(optional, one per line)</span>
                      </label>
                      <textarea
                        id="announcement-details"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        maxLength={5000}
                        rows={4}
                        placeholder={"Bullet one\nBullet two"}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">
                        Each line becomes a bullet point on the announcement card.
                      </p>
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
                        {isPending
                          ? "Saving..."
                          : mode === "create"
                            ? "Create Announcement"
                            : "Save Changes"}
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
