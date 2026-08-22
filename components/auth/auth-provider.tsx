"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user);
      if (data.user) void fetchProfileAndRoles(data.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfileAndRoles(session.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsLeader(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRoles]);

  const value = useMemo(
    () => ({ user, profile, loading, isAdmin, isLeader }),
    [user, profile, loading, isAdmin, isLeader],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
