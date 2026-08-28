// Parses the authored quiz questions into a seed migration.
// Run: node gen-questions.js <questions.json> <topics.md> <output.sql>
//
// The counterpart to gen-topics.js. Questions reference their topic by title,
// not by slug, so the topic markdown is read too and the title is put through
// the same slugify() — one definition of a slug, in two places that must agree.
//
// Everything the database cannot check is checked here. Two of those matter:
// a title that does not resolve would otherwise be silently dropped by the join
// and simply not exist in production, and duplicate indexes cannot be caught by
// a CHECK constraint because that would need a subquery.
const fs = require("fs");

const [, , questionsPath, topicsPath, outPath] = process.argv;

if (!questionsPath || !topicsPath || !outPath) {
  console.error("usage: gen-questions.js <questions.json> <topics.md> <output.sql>");
  process.exit(1);
}

// Kept identical to gen-topics.js. If one changes, both must.
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/@/g, 'at')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sqlStr = (v) => `'${String(v).replace(/'/g, "''")}'`;

// ---------------------------------------------------------------------------
// The topics the questions may attach to
// ---------------------------------------------------------------------------
const titleToSlug = new Map();

for (const raw of fs.readFileSync(topicsPath, "utf8").split(/\r?\n/)) {
  const item = raw.trim().match(/^\d+\.\s+\*\*(.+?)\*\*\s*(?:—\s*(.*))?$/);
  if (!item) continue;

  const title = item[1].trim();
  titleToSlug.set(title, slugify(title));
}

// ---------------------------------------------------------------------------
// Read and check
// ---------------------------------------------------------------------------
const source = JSON.parse(fs.readFileSync(questionsPath, "utf8"));

if (!Array.isArray(source)) {
  throw new Error("Expected the questions file to be a JSON array.");
}

const errors = [];
const rows = [];
const seenTopics = new Set();

for (const entry of source) {
  const title = entry && entry.topic;
  const slug = titleToSlug.get(title);

  // A title that does not resolve is an authoring mistake, not a new topic. The
  // join in the generated SQL would drop it without a word, so it stops here.
  if (!slug) {
    errors.push(`unknown topic title: ${JSON.stringify(title)}`);
    continue;
  }

  if (seenTopics.has(slug)) errors.push(`${title}: topic appears twice`);
  seenTopics.add(slug);

  const questions = Array.isArray(entry.questions) ? entry.questions : [];
  if (questions.length === 0) errors.push(`${title}: no questions`);

  questions.forEach((q, index) => {
    const where = `${title} #${index + 1}`;

    if (typeof q.question !== "string" || !q.question.trim()) {
      errors.push(`${where}: empty question`);
    }

    // Nullable in the database, required by the brief: a wrong answer with no
    // explanation teaches nothing, which is the point of the screen.
    if (typeof q.explanation !== "string" || !q.explanation.trim()) {
      errors.push(`${where}: empty explanation`);
    }

    const options = q.options;
    if (!Array.isArray(options) || options.length < 2) {
      errors.push(`${where}: needs at least two options`);
      return;
    }
    if (!options.every((o) => typeof o === "string" && o.trim())) {
      errors.push(`${where}: an option is empty or not a string`);
      return;
    }
    if (new Set(options).size !== options.length) {
      errors.push(`${where}: two options have the same text`);
    }

    const answers = q.correctIndexes;
    if (!Array.isArray(answers) || answers.length === 0) {
      errors.push(`${where}: correctIndexes is missing or empty`);
      return;
    }
    if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a < options.length)) {
      errors.push(`${where}: index outside the options: ${JSON.stringify(answers)}`);
      return;
    }
    // The one rule the database cannot enforce: a CHECK cannot contain the
    // subquery that finding duplicates needs.
    if (new Set(answers).size !== answers.length) {
      errors.push(`${where}: duplicate index: ${JSON.stringify(answers)}`);
    }
    if (answers.length === options.length) {
      errors.push(`${where}: every option is correct, which is not a question`);
    }

    rows.push({
      slug,
      question: q.question.trim(),
      options: JSON.stringify(options),
      // Sorted so the stored array reads in option order regardless of how it
      // was authored. The set is what matters, not the order it arrived in.
      answers: [...answers].sort((a, b) => a - b),
      explanation: q.explanation.trim(),
      // Position in the array is the order the player sees. Not authored.
      sortOrder: index,
    });
  });
}

if (errors.length > 0) {
  console.error(`${errors.length} problem(s) — nothing was written:\n`);
  for (const error of errors.slice(0, 40)) console.error("  - " + error);
  if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
const values = rows
  .map(
    (r) =>
      `  (${sqlStr(r.slug)}, ${sqlStr(r.question)}, ${sqlStr(r.options)}::jsonb, ` +
      `'{${r.answers.join(",")}}'::smallint[], ${sqlStr(r.explanation)}, ${r.sortOrder}::smallint)`
  )
  .join(",\n");

const answerCounts = {};
for (const r of rows) {
  answerCounts[r.answers.length] = (answerCounts[r.answers.length] || 0) + 1;
}

const header = `-- Quiz questions v1 — ${rows.length} questions across ${seenTopics.size} topics.
-- Generated from ${questionsPath}. Edit that file and regenerate rather than
-- hand-patching rows here:
--
--   npm run db:seed:questions
--
-- Questions are attached by topic slug, resolved from the topic title by the
-- same slugify() the topic seed uses. A title that does not resolve fails the
-- generator rather than silently dropping the question.
--
-- Re-runnable: there is no unique key to hang \`on conflict\` on, so the guard is
-- per topic — a topic that already has any question is skipped whole, rather
-- than half-inserted. The subquery is evaluated against the table as it was
-- before this statement, so the rows being inserted cannot hide each other.
--
-- correct answers per question:
${Object.keys(answerCounts)
  .sort()
  .map((n) => `--   ${n} correct  ${answerCounts[n]}`)
  .join("\n")}

insert into public.quiz_questions
  (topic_id, question, options, correct_indexes, explanation, sort_order)
select t.id, q.question, q.options, q.correct_indexes, q.explanation, q.sort_order
from (values
${values}
) as q(slug, question, options, correct_indexes, explanation, sort_order)
join public.topics t on t.slug = q.slug
where not exists (
  select 1 from public.quiz_questions existing where existing.topic_id = t.id
);
`;

fs.writeFileSync(outPath, header);
console.log(`${rows.length} questions across ${seenTopics.size} topics ->`, outPath);
console.log("correct answers per question:", answerCounts);
