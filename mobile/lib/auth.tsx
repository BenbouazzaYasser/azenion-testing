import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { apiJson } from "./api";
import { clearPeerCache } from "./peers";
import { friendlyError } from "./errors";

export interface HydrateSnapshot {
  user: { id: string; email: string | null };
  roles: string[];
  isPlatformAdmin: boolean;
  isCourseManager: boolean;
  labs: { isPlatformAdmin: boolean; canCreateLab: boolean };
  branchLeadership: Array<{ branch_id: string; slug: string; name: string }>;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  hydrate: HydrateSnapshot | null;
  bootstrapped: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshHydrate: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadHydrate(): Promise<HydrateSnapshot | null> {
  try {
    return await apiJson<HydrateSnapshot>("/api/auth/hydrate");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrate, setHydrate] = useState<HydrateSnapshot | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setHydrate(data.session ? await loadHydrate() : null);
      setBootstrapped(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!next) clearPeerCache();
      setSession(next);
      setHydrate(next ? await loadHydrate() : null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: friendlyError(error.message) } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, full_name: fullName } },
    });
    return error ? { error: friendlyError(error.message) } : {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setHydrate(null);
  }, []);

  const refreshHydrate = useCallback(async () => {
    setHydrate(await loadHydrate());
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      hydrate,
      bootstrapped,
      signIn,
      signUp,
      signOut,
      refreshHydrate,
    }),
    [session, hydrate, bootstrapped, signIn, signUp, signOut, refreshHydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider.");
  return ctx;
}
