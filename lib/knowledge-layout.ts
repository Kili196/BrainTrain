import type { KnowledgeCategory, TopicState } from "./knowledge";

// Where every dot in the knowledge net sits.
//
// Kept apart from the drawing, and pure, for one reason: the layout has to be
// **deterministic**. The same player must open this screen to the same sky
// every time — a net that rearranges itself on each mount is a screensaver, not
// a memory, and nobody can learn the shape of their own knowledge if it moves.
// So there is no randomness here at all: every position is derived from the
// topic's slug, which never changes, and from its category's fixed wedge.
//
// The mockup's geometry, kept as-is: a 390x430 field, three rings at 70/118/164
// around a centre at (195, 215).
export const VIEW_WIDTH = 390;
export const VIEW_HEIGHT = 430;
export const CENTRE_X = 195;
export const CENTRE_Y = 215;
export const RINGS = [70, 118, 164] as const;

// The five categories divide the circle between them, so a wedge is a fifth of
// it. Reading the net therefore teaches the map: Mind is always up there, and
// the dots that light up in one region mean one thing.
const SECTOR = (Math.PI * 2) / 5;

// Enough of a gap that two neighbouring categories do not blur into one band.
const SECTOR_PADDING = 0.16;

// Dot sizes and brightness per state. The three states are meant to be legible
// at a glance and without tapping: dust, a dot, a star.
const DOT = {
  untouched: { r: 1.1, o: 0.16 },
  spoken: { r: 2.6, o: 0.5 },
  mastered: { r: 4.3, o: 1 },
} as const satisfies Record<TopicState, { r: number; o: number }>;

// The centre dot — the player — and the five category hubs it holds.
const CENTRE_R = 4.6;
// Larger than any topic dot (a mastered one is 4.3), because a hub is a
// category and not a topic. With the ring gone it is the dot itself that has
// to read as structure rather than as one more star.
const HUB_R = 5;

export type NetNode = {
  slug: string;
  title: string;
  category: string;
  state: TopicState;
  x: number;
  y: number;
  r: number;
  o: number;
};

export type NetHub = {
  key: string;
  name: string;
  x: number;
  y: number;
  r: number;
  o: number;
};

export type NetLink = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  o: number;
};

export type NetLayout = {
  centre: { x: number; y: number; r: number };
  hubs: NetHub[];
  nodes: NetNode[];
  links: NetLink[];
};

export function layoutNet(
  categories: readonly KnowledgeCategory[]
): NetLayout {
  const hubs: NetHub[] = [];
  const nodes: NetNode[] = [];
  const links: NetLink[] = [];

  categories.forEach((category, index) => {
    // The wedge belongs to the category's position in the content order, not to
    // how many topics it has — so a category gaining topics does not push the
    // others around the sky.
    const start = index * SECTOR - Math.PI / 2 + SECTOR_PADDING;
    const span = SECTOR - SECTOR_PADDING * 2;

    const hubAngle = start + span / 2;
    const hub = {
      key: category.key,
      name: category.name,
      ...pointAt(hubAngle, RINGS[0]),
      r: HUB_R,
      // A category nobody has touched is there but dim, the same way its topics
      // are: the map is complete from the first day, it just is not lit yet.
      o: category.spoken > 0 ? 0.85 : 0.3,
    };

    hubs.push(hub);

    // Every hub is wired to the centre, touched or not — the five branches are
    // the shape of the subject, not a reward.
    links.push({
      id: `centre-${category.key}`,
      x1: CENTRE_X,
      y1: CENTRE_Y,
      x2: hub.x,
      y2: hub.y,
      o: category.spoken > 0 ? 0.16 : 0.07,
    });

    // Sorted by slug rather than taken in the order `evaluateKnowledge` sorted
    // them, which is by score: the position of a dot must not move when the
    // player gets better at it. What changes is its brightness, nothing else.
    const ordered = [...category.topics].sort((a, b) =>
      a.slug.localeCompare(b.slug)
    );

    ordered.forEach((topic, position) => {
      // Rings alternate down the list, so a category's topics spread over the
      // depth of the wedge instead of crowding one arc.
      const ring = RINGS[(position % (RINGS.length - 1)) + 1];

      // Spread across the wedge by position, then nudged by the slug's own
      // hash. Without the nudge the dots line up in visible rows; with it they
      // read as a scattering, and it is still the same scattering every time.
      const step = span / Math.max(ordered.length, 1);
      const jitter = (hash(topic.slug) - 0.5) * step * 0.85;
      const angle = start + step * (position + 0.5) + jitter;

      // The radius is nudged too, or every dot on a ring would sit on a visible
      // circle rather than in a cloud.
      const radius = ring + (hash(`${topic.slug}:r`) - 0.5) * 16;

      const node = {
        slug: topic.slug,
        title: topic.title,
        category: category.key,
        state: topic.state,
        ...pointAt(angle, radius),
        ...DOT[topic.state],
      };

      nodes.push(node);

      // Only topics that have been played are wired to their hub. This is the
      // one thing on the screen that literally grows: an untouched pool is
      // loose dust around five branches, and every round draws another thread
      // into the web.
      if (topic.state !== "untouched") {
        links.push({
          id: `${category.key}-${topic.slug}`,
          x1: hub.x,
          y1: hub.y,
          x2: node.x,
          y2: node.y,
          o: topic.state === "mastered" ? 0.22 : 0.12,
        });
      }
    });
  });

  return {
    centre: { x: CENTRE_X, y: CENTRE_Y, r: CENTRE_R },
    hubs,
    nodes,
    links,
  };
}

function pointAt(angle: number, radius: number): { x: number; y: number } {
  return {
    x: round(CENTRE_X + Math.cos(angle) * radius),
    y: round(CENTRE_Y + Math.sin(angle) * radius),
  };
}

// Two decimals is finer than a phone can draw and keeps the numbers readable
// when this is dumped while debugging.
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// FNV-1a, folded into [0, 1). A hash and not `Math.random` because the whole
// point of this file is that the sky does not move: the same slug has to give
// the same number on every device, on every launch, forever.
function hash(input: string): number {
  let value = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    // The FNV prime, by shifts, because a plain multiply overflows into
    // floating point and stops being reproducible.
    value +=
      (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24);
  }

  return ((value >>> 0) % 100000) / 100000;
}
