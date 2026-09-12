function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy mobile/.env.example to mobile/.env and fill it in.`);
  }
  return value;
}

export const SUPABASE_URL = required("EXPO_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = required("EXPO_PUBLIC_SUPABASE_ANON_KEY");
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://azenion.com"
).replace(/\/$/, "");

export const APP_VERSION = "0.1.0";
