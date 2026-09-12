import type { Database } from "./database.types";
import type { OnboardingData } from "./onboarding-storage";
import { supabase } from "./supabase";

// The profile in Supabase. AsyncStorage still holds a copy — that is what
// `app/index.tsx` reads on a cold start to decide whether to show onboarding,
// and it has to answer that offline — but this is the truth. See
// `lib/onboarding-storage.ts` for the other half.
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// Update, never insert. The row already exists: a trigger on auth.users creates
// it in the same transaction as the signup, so a client that crashes mid-flow
// can never leave a user without one. RLS agrees — profiles has a select and an
// update policy and deliberately no insert policy, so an upsert that fell
// through to an insert would be refused.
export async function saveProfile(
  userId: string,
  data: OnboardingData
): Promise<void> {
  const update: ProfileUpdate = {
    // Nullable in the table, and the name step allows an empty one. "" would be
    // a name that renders as nothing; null is the absence of one.
    display_name: data.name.trim() || null,
    country_code: data.countryCode.toUpperCase(),
    birth_date: toIsoDate(data.birth),
  };

  const { data: rows, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .select("id");

  if (error) throw error;

  // An update that matches nothing is not an error in Postgres — it reports
  // success and changes zero rows. Without this check a missing profile would
  // look exactly like a saved one, which is the failure mode this whole branch
  // exists to remove.
  if (rows.length === 0) {
    throw new Error(`No profile row for user ${userId}`);
  }
}

// The onboarding flow keeps the date as three separate fields, because that is
// how the design draws it. Postgres wants one `date`.
//
// The parts are already validated on the birthdate step — CONTINUE stays
// disabled until they form a real calendar date — so this only has to pad them.
// Anything genuinely missing becomes null, which the column allows; anything
// impossible that got this far is left to the table's own check constraints
// rather than quietly dropped.
function toIsoDate(birth: OnboardingData["birth"]): string | null {
  const { day, month, year } = birth;
  if (!day || !month || !year) return null;

  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
