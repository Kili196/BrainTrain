import type { Database } from "./database.types";
import {
  getHasOnboarded,
  saveOnboarding,
  type OnboardingData,
} from "./onboarding-storage";
import { supabase } from "./supabase";

// The profile in Supabase. AsyncStorage still holds a copy — that is what
// `app/index.tsx` reads on a cold start to decide whether to show onboarding,
// and it has to answer that offline — but this is the truth. See
// `lib/onboarding-storage.ts` for the other half.
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// What the profile screen renders. `id` is deliberately not selected — the
// caller already has the user id to ask with, and a row that carries it again
// only invites someone to trust the copy instead of the session.
export type Profile = Pick<
  ProfileRow,
  "display_name" | "country_code" | "birth_date" | "created_at"
>;

const PROFILE_COLUMNS =
  "display_name, country_code, birth_date, created_at" as const;

export async function fetchProfile(userId: string): Promise<Profile | null> {
  // `maybeSingle`, not `single`: the signup trigger guarantees the row exists,
  // and `single` would turn its absence into an error. The one thing that can
  // still hide it is RLS — a session that expired between mounting and reading —
  // and for that, null is the truthful answer rather than a crash.
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
}

// Answers "should this account see onboarding?" for the routing gate in
// `app/index.tsx`, and is what makes stats the same on a new phone: without it
// the decision was purely the device-local flag, so a returning account on a
// fresh device — whose profile and rounds already live in Supabase — got sent
// back through onboarding and overwrote its own profile.
//
// Local first, because the common case (returning user, same phone) must answer
// offline and instantly. Only when there is no local copy do we ask the server:
// the profile row always exists (signup trigger), so "already onboarded" means
// it carries the data the flow writes, which we detect by `country_code` — the
// one field onboarding always sets and a fresh row never has. When it does, we
// seed the local flag from it so this network round trip happens once per device.
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  if (await getHasOnboarded()) return true;

  const profile = await fetchProfile(userId);
  if (!profile || !profile.country_code) return false;

  await saveOnboarding({
    name: profile.display_name ?? "",
    countryCode: profile.country_code,
    birth: birthFieldsFromIso(profile.birth_date),
  });
  return true;
}

// Inverse of `toIsoDate`: the flow keeps the birthdate as three fields, so a
// profile hydrated from the server's single `date` is split back apart. The
// padded parts ("05") are valid as-is — nothing reads them back except the
// presence check — so there's no need to strip the zero-padding.
function birthFieldsFromIso(iso: string | null): OnboardingData["birth"] {
  if (!iso) return { day: "", month: "", year: "" };
  const [year = "", month = "", day = ""] = iso.split("-");
  return { day, month, year };
}

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

  await applyUpdate(userId, update);
}

// The editable half of the profile, changed from `app/edit-profile.tsx`.
//
// Name and country only. The birth date is deliberately not here: it is asked
// once in onboarding and nothing else in the app rewrites it, so an edit screen
// that offered it would be the only door to a value the leaderboard's age
// grouping will later depend on.
export async function updateProfileDetails(
  userId: string,
  details: { name: string; countryCode: string }
): Promise<void> {
  const update: ProfileUpdate = {
    // Same rule as onboarding: "" is a name that renders as nothing, null is
    // the absence of one, and the column is nullable.
    display_name: details.name.trim() || null,
    country_code: details.countryCode.toUpperCase(),
  };

  await applyUpdate(userId, update);
}

async function applyUpdate(
  userId: string,
  update: ProfileUpdate
): Promise<void> {
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
