import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Supabase Auth persistence backed by SecureStore (Keychain / Keystore).
 * Access/refresh tokens are never written to AsyncStorage or any
 * unencrypted store. The service-role key must never enter this app; only
 * the public anon key is bundled.
 */
const SecureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
