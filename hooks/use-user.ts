"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface ProfileData {
  avatar_url: string | null;
  full_name: string | null;
  username: string | null;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLeader, setIsLeader] = useState(false);

  function fetchRoles(id: string) {
    const supabase = createClient();
    return Promise.all([
      supabase.rpc("is_platform_admin"),
      supabase.from("branch_leaders").select("branch_id").eq("user_id", id).limit(1),
    ]).then(([{ data: adminResult }, { data: leaderRows }]) => {
      setIsAdmin(!!adminResult);
      setIsLeader((leaderRows ?? []).length > 0);
    });
  }

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("profiles")
          .select("avatar_url, full_name, username")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: profileData }) => {
            setProfile(profileData);
          });
        fetchRoles(data.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("avatar_url, full_name, username")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data: profileData }) => {
            setProfile(profileData);
          });
        fetchRoles(session.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsLeader(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading, isAdmin, isLeader };
}
