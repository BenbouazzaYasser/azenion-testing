"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SharePostDialog } from "@/components/feed/share-post-dialog";

interface SharePostButtonProps {
  postId: string;
  currentUserId: string | null;
}

export function SharePostButton({ postId, currentUserId }: SharePostButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={!currentUserId}
        title={currentUserId ? "Share this post" : "Sign in to share posts"}
        aria-label="Share this post"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full text-xs transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:pointer-events-none disabled:opacity-50 text-ink-600 hover:text-ink-200"
      >
        <Share2 size={14} />
        <span className="hidden sm:inline">Share</span>
      </button>

      <SharePostDialog
        open={open}
        postId={postId}
        currentUserId={currentUserId}
        onClose={() => setOpen(false)}
      />
    </>
  );
}