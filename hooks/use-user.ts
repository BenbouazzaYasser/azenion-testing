"use client";

import { useAuth, type ProfileData } from "@/components/auth/auth-provider";

export type { ProfileData };

/**
 * Current user session + profile + roles, shared app-wide so every consumer
 * (navbar, search, notifications, CTAs) reads from one fetched source instead
 * of firing duplicate Supabase requests on every page navigation.
 */
export function useUser() {
  return useAuth();
}