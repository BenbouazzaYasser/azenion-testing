"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface ProfileData {
  avatar_url: string | null;
  full_name: string | null;
  username: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: ProfileData | null;
  loading: boolean;
  isAdmin: boolean;
  isLeader: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isLeader: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLeader, setIsLeader] = useState(false);

  const pathname = usePathname();
  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    const supabase = createClient();
    const [{ data: profileData }, { data: adminResult }, { data: leaderRows }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("avatar_url, full_name, username")
          .eq("id", userId)
          .maybeSingle(),
        supabase.rpc("is_platform_admin"),
        supabase.from("branch_leaders").select("branch_id").eq("user_id", userId).limit(1),
      ]);
    setProfile(profileData);
    setIsAdmin(!!adminResult);
    setIsLeader((leaderRows ?? []).length > 0);
  }, []);

  const applySession = useCallback(
    (user: User | null) => {
      setUser(user);
      const userId = user?.id ?? null;
      if (userId && userId !== lastUserIdRef.current) {
        lastUserIdRef.current = userId;
        void fetchProfileAndRoles(userId);
      } else if (!userId) {
        lastUserIdRef.current = null;
        setProfile(null);
        setIsAdmin(false);
        setIsLeader(false);
      }
    },
    [fetchProfileAndRoles],
  );

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Server-side auth (signIn/signOut) writes the session cookie but does not
    // notify the browser supabase-js context. When redirected with the
    // `refresh_auth` flag, re-read the session straight from cookies so the UI
    // reflects the auth state immediately instead of a stale "logged out".
    const refreshFlag = new URLSearchParams(window.location.search).has(
      "refresh_auth",
    );

    if (refreshFlag) {
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        applySession(data.session?.user ?? null);
        setLoading(false);
        window.history.replaceState(null, "", window.location.pathname);
      });
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (cancelled) return;
        applySession(data.user);
        setLoading(false);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySession]);

  // Server-action redirects (e.g. after signIn/signOut) are soft navigations:
  // this provider does not remount, so the mount-time check above is skipped.
  // Re-check for the `refresh_auth` flag on every path change and re-sync the
  // session from cookies when present.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("refresh_auth")) return;
    const supabase = createClient();
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      applySession(data.session?.user ?? null);
      window.history.replaceState(null, "", window.location.pathname);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, applySession]);

  const value = useMemo(
    () => ({ user, profile, loading, isAdmin, isLeader }),
    [user, profile, loading, isAdmin, isLeader],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
