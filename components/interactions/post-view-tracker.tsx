"use client";

import { useEffect, useRef } from "react";
import { recordPostView } from "@/actions/interactions.actions";

const TOKEN_KEY = "azenion.session_token";

function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

interface PostViewTrackerProps {
  postId: string;
}

/**
 * Records a view for a feed post once per post per browser session.
 * Renders nothing — it exists purely to fire the `recordPostView` action
 * when a post is genuinely opened on its detail page.
 */
export function PostViewTracker({ postId }: PostViewTrackerProps) {
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    void recordPostView(postId, getSessionToken());
  }, [postId]);

  return null;
}