// Parses the Themenpool markdown into a seed migration.
// Run: node gen-topics.js <input.md> <output.sql>
const fs = require("fs");

const [, , inPath, outPath] = process.argv;
const src = fs.readFileSync(inPath, "utf8");

// Section heading -> category slug used in the DB. The heading is the display
// name; the column holds a short stable machine key.
const CATEGORY_SLUGS = {
  'Mind & Behaviour': 'mind',
  'Universe & Physics': 'physics',
  'Earth & Life': 'nature',
  History: 'history',
  Technology: 'technology',
};

function slugify(title) {
  return title
    .toLowerCase()
    // Dropped rather than replaced, so "Moore's law" becomes moores-law and not
    // moore-s-law. Everything else non-alphanumeric collapses into a separator.
    .replace(/['’]/g, '')
    .replace(/@/g, 'at')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sqlStr = (v) => (v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const rows = [];
let category = null;
const counts = {};

for (const raw of src.split(/\r?\n/)) {
  const line = raw.trim();

  const heading = line.match(/^##\s+\d+\.\s+(.+)$/);
  if (heading) {
    const name = heading[1].trim();
    category = CATEGORY_SLUGS[name];
    if (!category) throw new Error(`Unmapped category heading: ${name}`);
    counts[category] = 0;
    continue;
  }

  // "12. **Title** — Description."  (description optional)
  const item = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(?:—\s*(.*))?$/);
  if (!item || !category) continue;

  const title = item[1].trim();
  const description = (item[2] || "").trim() || null;
  rows.push({ slug: slugify(title), category, title, description });
  counts[category]++;
}

const slugs = new Set();
for (const r of rows) {
  if (slugs.has(r.slug)) throw new Error(`Duplicate slug: ${r.slug}`);
  slugs.add(r.slug);
  if (!r.slug) throw new Error(`Empty slug for title: ${r.title}`);
}

const values = rows
  .map(
    (r) =>
      `  (${sqlStr(r.slug)}, ${sqlStr(r.category)}, ${sqlStr(r.title)}, ${sqlStr(
        r.description
      )}, 'published')`
  )
  .join(",\n");

const header = `-- Topic pool v1 — ${rows.length} topics across ${
  Object.keys(counts).length
} categories.
-- Generated from supabase/content/topics-v1.md. Edit that file and regenerate
-- rather than hand-patching rows here:
--
--   npm run db:seed
--
-- Category values are machine keys; the section headings in the source file are
-- the display names the client shows.
--
-- \`on conflict (slug) do nothing\` makes this safe to re-run and stops it from
-- overwriting edits made later in the dashboard.
--
${Object.entries(counts)
  .map(([c, n]) => `--   ${c.padEnd(11)} ${n}`)
  .join("\n")}

insert into public.topics (slug, category, title, description, status) values
${values}
on conflict (slug) do nothing;
`;

fs.writeFileSync(outPath, header);
console.log(`${rows.length} topics ->`, outPath);
console.log(counts);
