// The one place a quiz result is turned into a number.
//
// The result travels as a route param — "10110", one character per question —
// because the screens after the quiz are deep-linkable and a navigation cannot
// carry an object. Two screens now read it: `analyzing`, which counts the score
// into its ring while the round is written, and `quiz-result`, which draws it
// out. Parsing it in both would be two copies of the same rule, and the kind
// that drifts quietly: one of them rounding differently is a score that changes
// between two screens of the same round.

// 100 spread over the round, so five questions are worth 20 each. The mockup
// counts ten questions at ten points; the database has five per topic and that
// is what the round asks.
export const TOTAL_POINTS = 100;

// Anything that is not a run of 0s and 1s is treated as no round at all, which
// is what makes the screens safe to deep-link into: a hand-typed param yields
// an empty round rather than a broken screen.
export function parseOutcomes(results: string | undefined): string[] {
  return (results ?? "")
    .split("")
    .filter((mark) => mark === "0" || mark === "1");
}

export function scoreFromOutcomes(outcomes: string[]): number {
  if (outcomes.length === 0) return 0;

  const correct = outcomes.filter((mark) => mark === "1").length;

  return Math.round((correct / outcomes.length) * TOTAL_POINTS);
}
