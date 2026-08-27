// The five topic categories. `key` is the value stored in `topics.category` in
// Supabase; `name` is what the user sees. Order follows the topic pool markdown
// (supabase/content/topics-v1.md), so the picker reads in the same order the
// content was authored in.
//
// Verified against the database on 2026-08-28: 25 published topics per key,
// 125 in total. Adding a category means adding it to the pool markdown first —
// this list follows the content, it does not define it.
export type CategoryKey =
  | "mind"
  | "physics"
  | "nature"
  | "history"
  | "technology";

export type Category = {
  key: CategoryKey;
  name: string;
};

export const categories: Category[] = [
  { key: "mind", name: "Mind & Behaviour" },
  { key: "physics", name: "Universe & Physics" },
  { key: "nature", name: "Earth & Life" },
  { key: "history", name: "History" },
  { key: "technology", name: "Technology" },
];

// `topics.category` is a plain text column, not a Postgres enum, so the database
// can hand us a key this list has never heard of — a category added by a
// migration before the app ships the matching entry. Falling back to the raw key
// keeps that row readable instead of blanking the label.
const NAMES: Record<string, string> = Object.fromEntries(
  categories.map((category) => [category.key, category.name])
);

export function categoryName(key: string): string {
  return NAMES[key] ?? key;
}
