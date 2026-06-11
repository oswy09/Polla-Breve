import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn("Missing Supabase env vars: REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export function requireSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY");
  }
}