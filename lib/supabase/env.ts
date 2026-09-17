

export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
  isPlaceholder: boolean;
}

export function getSupabaseEnv(): SupabaseEnvConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const isBuildOrTest =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test" ||
    process.env.VITEX_TEST === "true" ||
    process.env.VITEST === "true";

  if (!url || !anonKey) {
    if (isBuildOrTest) {
      return {
        url: url || "https://placeholder.supabase.co",
        anonKey: anonKey || "placeholder-key",
        serviceKey: serviceKey || "placeholder-service-key",
        isPlaceholder: true,
      };
    }
    throw new Error(
      "Configuration Error: Missing required Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY). Please configure them in your environment.",
    );
  }

  return {
    url,
    anonKey,
    serviceKey: serviceKey || "",
    isPlaceholder: false,
  };
}

export function getAdminSupabaseEnv(): { url: string; serviceKey: string; isPlaceholder: boolean } {
  const env = getSupabaseEnv();
  if (!env.serviceKey && !env.isPlaceholder) {
    throw new Error(
      "Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY environment variable required for administrative operations.",
    );
  }
  return {
    url: env.url,
    serviceKey: env.serviceKey || "placeholder-service-key",
    isPlaceholder: env.isPlaceholder,
  };
}

/**
 * Edge-tolerant accessor for middleware (`proxy.ts`). Unlike
 * `getSupabaseEnv()` it NEVER throws: when the public vars are present
 * (normal deploys, `.env.local`) the real session refresh works; when absent
 * it degrades to the placeholder config exactly as the pre-refactor
 * middleware did. Server/admin code must keep using the strict accessors.
 */
export function getSupabaseEdgeEnv(): SupabaseEnvConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    return { url, anonKey, serviceKey: "", isPlaceholder: false };
  }
  return {
    url: "https://placeholder.supabase.co",
    anonKey: "placeholder-key",
    serviceKey: "placeholder-service-key",
    isPlaceholder: true,
  };
}
