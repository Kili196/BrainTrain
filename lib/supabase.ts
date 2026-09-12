import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { authStorage } from "./secure-store-adapter";

// The one Supabase client for the whole app. Created at module load, so every
// import shares the same instance — two clients would mean two connection pools
// and two competing session refreshers.
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
    // The session goes to the Keychain / encrypted shared preferences, not to
    // AsyncStorage. Without this line supabase-js would default to whatever
    // global storage it can find and keep the refresh token in plain text.
    storage: authStorage,
    // Keep the session across restarts: the anonymous user is the account, so
    // losing it loses the user's rounds and points.
    persistSession: true,
    // Refresh the access token before it expires. supabase-js runs the timer,
    // but on React Native it does not know when the app is backgrounded — that
    // part is `startAutoRefresh`/`stopAutoRefresh` on an AppState listener,
    // wired up in the auth provider.
    autoRefreshToken: true,
    // Deep-link only concern; on native there is no URL fragment to read.
    detectSessionInUrl: false,
  },
});
