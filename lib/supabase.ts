import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// The one Supabase client for the whole app. Created at module load, so every
// import shares the same instance — two clients would mean two connection pools
// and, once auth exists, two competing session refreshers.
//
// Both values are read from `.env` at build time. Metro only inlines variables
// prefixed with EXPO_PUBLIC_, and `process.env.X` has to be written out in full
// for that substitution to happen — destructuring `process.env` returns
// undefined here.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Failing loudly at startup beats a confusing "Invalid URL" from deep inside
  // the first query. Usually means .env is missing or Metro wasn't restarted.
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env, fill it in, then restart Metro with `npx expo start -c`."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // No auth in the app yet, so there is no session to keep. Turning these off
    // stops supabase-js from reaching for a storage adapter it doesn't have and
    // from running a refresh timer that has nothing to refresh.
    persistSession: false,
    autoRefreshToken: false,
    // Deep-link only concern; on native there is no URL fragment to read.
    detectSessionInUrl: false,
  },
});
