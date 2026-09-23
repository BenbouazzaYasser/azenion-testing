"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createFeedPost,
  getFeedItemById,
  uploadFeedPostMedia,
  type FeedItemWithAuthor,
} from "@/actions/feed.actions";
import { getCurrentUserProfile } from "@/lib/current-user-profile";

export interface PendingMedia {
  file: File;
  kind: "image" | "video";
  /** Blob preview URL — owned by the provider once submitted. */
  url: string;
}

export interface PendingPost {
  tmpId: string;
  status: "posting" | "failed" | "resolved";
  /** Optimistic item (blob preview URLs); swapped for the server item on resolve. */
  item: FeedItemWithAuthor;
  /** Retry payload kept for the failed card. */
  title: string;
  body: string;
  media: PendingMedia[];
  error?: string;
}

export interface UploadStatus {
  tmpId: string;
  index: number;
  total: number;
}

interface FeedPendingValue {
  pending: PendingPost[];
  uploadStatus: UploadStatus | null;
  submitPost: (input: { title: string; body: string; media: PendingMedia[] }) => void;
  retryPost: (tmpId: string) => void;
  dismissPost: (tmpId: string) => void;
}

const FeedPendingContext = createContext<FeedPendingValue | null>(null);

function revokeBlobs(item: FeedItemWithAuthor) {
  for (const url of [...item.images, ...item.videos]) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}

export function FeedPendingProvider({
  children,
  currentUserId,
}: {
  children: ReactNode;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingPost[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const pendingRef = useRef<PendingPost[]>([]);
  pendingRef.current = pending;

  // Warm the shared profile fetch at mount so a submit never waits on it.
  useEffect(() => {
    void getCurrentUserProfile();
  }, []);

  const mutate = useCallback(
    (tmpId: string, fn: (p: PendingPost) => PendingPost) =>
      setPending((prev) => prev.map((p) => (p.tmpId === tmpId ? fn(p) : p))),
    [],
  );

  // Blob preview URLs are owned by this provider after submission.
  useEffect(() => {
    return () => {
      for (const p of pendingRef.current) revokeBlobs(p.item);
    };
  }, []);

  const runPipeline = useCallback(
    async (tmpId: string, title: string, body: string, media: PendingMedia[]) => {
      mutate(tmpId, (p) => ({ ...p, status: "posting", error: undefined }));
      setUploadStatus(null);
      try {
        const fd = new FormData();
        fd.set("title", title);
        fd.set("body", body);
        const created = await createFeedPost(fd);
        if (created && "error" in created && created.error) {
          mutate(tmpId, (p) => ({ ...p, status: "failed", error: created.error as string }));
          return;
        }
        const postId = "id" in created ? (created.id as string) : null;
        if (!postId) {
          mutate(tmpId, (p) => ({ ...p, status: "failed", error: "Post could not be created. Please try again." }));
          return;
        }

        for (let i = 0; i < media.length; i++) {
          setUploadStatus({ tmpId, index: i + 1, total: media.length });
          const mediaFd = new FormData();
          mediaFd.set("post_id", postId);
          mediaFd.set("file", media[i]!.file);
          mediaFd.set("kind", media[i]!.kind);
          const uploaded = await uploadFeedPostMedia(mediaFd);
          if (uploaded && "error" in uploaded && uploaded.error) {
            mutate(tmpId, (p) => ({ ...p, status: "failed", error: uploaded.error as string }));
            return;
          }
        }
        setUploadStatus(null);

        const real = await getFeedItemById(postId, currentUserId);
        if (!real) {
          // Post exists server-side but couldn't be enriched (rare). Drop the
          // optimistic row and let a refresh surface it, rather than
          // rendering blob URLs through FeedCard.
          setPending((prev) => {
            const row = prev.find((p) => p.tmpId === tmpId);
            if (row) revokeBlobs(row.item);
            return prev.filter((p) => p.tmpId !== tmpId);
          });
          router.refresh();
          return;
        }

        mutate(tmpId, (p) => {
          revokeBlobs(p.item);
          return { ...p, status: "resolved", item: real };
        });
        router.refresh();
      } catch (err) {
        mutate(tmpId, (p) => ({
          ...p,
          status: "failed",
          error: err instanceof Error ? err.message : "An unexpected error occurred",
        }));
      }
    },
    [currentUserId, mutate, router],
  );

  const submitPost = useCallback(
    async (input: { title: string; body: string; media: PendingMedia[] }): Promise<string> => {
      const tmpId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      const profile = await getCurrentUserProfile();
      const images = input.media.filter((m) => m.kind === "image").map((m) => m.url);
      const videos = input.media.filter((m) => m.kind === "video").map((m) => m.url);

      const optimistic: FeedItemWithAuthor = {
        id: tmpId,
        source_type: "user_post",
        source_id: null,
        author_id: profile?.id ?? currentUserId,
        author_name: profile?.full_name ?? null,
        author_avatar: profile?.avatar_url ?? null,
        author_username: profile?.username ?? null,
        entity_name: null,
        entity_slug: null,
        entity_logo_url: null,
        entity_type: "POST",
        branch_name: null,
        branch_slug: null,
        branch_logo_url: null,
        title: input.title,
        body: input.body || null,
        images,
        videos,
        link_url: null,
        is_pinned: false,
        created_at: new Date().toISOString(),
        updated_at: null,
        like_count: 0,
        comment_count: 0,
        user_has_liked: false,
        liked_by_names: [],
        saved_by_user: false,
      };

      setPending((prev) => [
        { tmpId, status: "posting", item: optimistic, title: input.title, body: input.body, media: input.media },
        ...prev,
      ]);
      void runPipeline(tmpId, input.title, input.body, input.media);
      return tmpId;
    },
    [currentUserId, runPipeline],
  );

  const retryPost = useCallback(
    (tmpId: string) => {
      const post = pendingRef.current.find((p) => p.tmpId === tmpId);
      if (!post || post.status !== "failed") return;
      void runPipeline(post.tmpId, post.title, post.body, post.media);
    },
    [runPipeline],
  );

  const dismissPost = useCallback((tmpId: string) => {
    setPending((prev) => {
      const row = prev.find((p) => p.tmpId === tmpId);
      if (row) revokeBlobs(row.item);
      return prev.filter((p) => p.tmpId !== tmpId);
    });
    if (uploadStatus?.tmpId === tmpId) setUploadStatus(null);
  }, [uploadStatus]);

  return (
    <FeedPendingContext.Provider
      value={{ pending, uploadStatus, submitPost, retryPost, dismissPost }}
    >
      {children}
    </FeedPendingContext.Provider>
  );
}

export function useFeedPending(): FeedPendingValue {
  const ctx = useContext(FeedPendingContext);
  if (!ctx) throw new Error("useFeedPending must be used within FeedPendingProvider");
  return ctx;
}