"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { createAnnouncement, updateAnnouncement } from "@/actions/announcements.actions";
import { useDialogFocus, useDialogOpen } from "@/lib/use-dialog-focus";
import type { Announcement } from "@/data/announcements";

interface AnnouncementFormDialogProps {
  mode: "create" | "edit";
  announcement?: Announcement;
}

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

function DialogContent({
  mode,
  announcement,
  onClose,
}: {
  mode: "create" | "edit";
  announcement?: Announcement;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [emoji, setEmoji] = useState(announcement?.emoji ?? "📢");
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [category, setCategory] = useState(announcement?.category ?? "Platform");
  const [badge, setBadge] = useState(announcement?.badge ?? "");
  const [description, setDescription] = useState(announcement?.description ?? "");
  const [details, setDetails] = useState(announcement?.details?.join("\n") ?? "");

  const { mounted } = useDialogOpen(true, onClose);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmittingStatus("submitting");

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
        setSubmittingStatus("error");
        return;
      }

      setSubmittingStatus("success");
      onClose();
      router.refresh();
    });
  }

  const [submittingStatus, setSubmittingStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  return (
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
        onClick={onClose}
      />

      <div
        ref={dialogFocusRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
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
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
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

          {submittingStatus === "submitting" && (
            <div aria-live="polite" className="mb-6 sr-only">
              Saving announcement...
            </div>
          )}
          {submittingStatus === "success" && (
            <div aria-live="polite" className="mb-6 sr-only">
              Announcement saved successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-[96px_1fr]">
              <FormField label="Emoji" htmlFor="announcement-emoji">
                <input
                  id="announcement-emoji"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  maxLength={16}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Title" htmlFor="announcement-title" required>
                <input
                  id="announcement-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="e.g. New Feature Release"
                  className={inputClass}
                />
              </FormField>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Category" htmlFor="announcement-category">
                <input
                  id="announcement-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Platform, Community, Development"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Badge" htmlFor="announcement-badge">
                <input
                  id="announcement-badge"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. Latest"
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField
              label="Description"
              htmlFor="announcement-description"
              helper={`${description.length}/5000`}
            >
              <textarea
                id="announcement-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={5000}
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </FormField>

            <FormField
              label="Key points"
              htmlFor="announcement-details"
              helper="Each line becomes a bullet point on the announcement card."
            >
              <textarea
                id="announcement-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={5000}
                rows={4}
                placeholder={"Bullet one\nBullet two"}
                className={`${inputClass} resize-none`}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
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
    </div>
  );
}

export function AnnouncementFormDialog({ mode, announcement }: AnnouncementFormDialogProps) {
  const [open, setOpen] = useState(false);

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
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-400 transition-colors hover:border-accent-400/50 hover:text-accent-400"
        >
          <Pencil size={13} />
        </button>
      )}

      {open
        ? createPortal(
            <DialogContent
              key={`${mode}-${announcement?.id ?? "new"}`}
              mode={mode}
              announcement={announcement}
              onClose={() => setOpen(false)}
            />,
            document.body
          )
        : null}
    </>
  );
}