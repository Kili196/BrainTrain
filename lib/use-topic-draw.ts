import { useCallback, useEffect, useRef, useState } from "react";

import type { Topic } from "./topics";
import { useReduceMotion } from "./use-reduce-motion";

// The draw: the word on the stage races through other topics and brakes onto
// the one that was actually drawn.
//
// 16 to 19 ticks, each 13% slower than the last — 38ms at the start, about
// 290ms at the end, roughly 2.2 seconds in total. The randomised count is what
// stops two draws in a row from feeling identical.
const FIRST_TICK_MS = 38;
const TICK_GROWTH = 1.13;
const MIN_TICKS = 16;
const TICK_SPREAD = 4;

export type TopicDraw = {
  // The topic that was drawn, once the reel has landed on it. Stays put during
  // the next draw, so a failed one leaves the last good result in place.
  topic: Topic | null;
  // What the stage should show right now — a decoy mid-spin, the real title
  // once it lands, null before the first draw.
  title: string | null;
  isDrawing: boolean;
  error: string | null;
  draw: (
    load: () => Promise<Topic | null>,
    emptyMessage: string
  ) => void;
};

// `decoys` are the titles the reel spins through. Home already fetches a pool
// for the orbit behind the stage, and the mockup likewise draws both from one
// list — a word flying past the middle that also circles in the background is
// exactly right, because the reel is meant to look like it is picking one of
// them.
export function useTopicDraw(decoys: string[]): TopicDraw {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [title, setTitleState] = useState<string | null>(null);
  const [isDrawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reduceMotion = useReduceMotion();

  // `draw` is built once and captures these, so everything it reads at call
  // time has to come through a ref.
  const titleRef = useRef<string | null>(null);
  const decoysRef = useRef(decoys);
  const reduceMotionRef = useRef(reduceMotion);
  const drawing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    decoysRef.current = decoys;
  }, [decoys]);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const setTitle = useCallback((value: string | null) => {
    titleRef.current = value;
    setTitleState(value);
  }, []);

  const draw = useCallback(
    (load: () => Promise<Topic | null>, emptyMessage: string) => {
      // Guard against a double tap firing two draws — the second result would
      // overwrite the first and the stage would visibly flicker.
      if (drawing.current) return;

      drawing.current = true;
      setDrawing(true);
      setError(null);

      // Whatever is on the stage now is what a failed draw falls back to.
      const previous = titleRef.current;
      const pool = decoysRef.current;

      // Plain object rather than closed-over `let`s: the reel and the request
      // run concurrently and both have to see the same, latest values.
      const outcome: {
        done: boolean;
        topic: Topic | null;
        error: string | null;
      } = { done: false, topic: null, error: null };

      const request = load().then(
        (result) => {
          outcome.topic = result;
          outcome.done = true;
        },
        (cause) => {
          // The thrown message already says what failed.
          outcome.error =
            cause instanceof Error ? cause.message : "Something went wrong.";
          outcome.done = true;
        }
      );

      const land = () => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }

        if (outcome.error) {
          setError(outcome.error);
          setTitle(previous);
        } else if (!outcome.topic) {
          setError(emptyMessage);
          setTitle(previous);
        } else {
          setTopic(outcome.topic);
          setTitle(outcome.topic.title);
        }

        drawing.current = false;
        setDrawing(false);
      };

      // Nothing to spin through — the pool failed to load — or the device asks
      // for less motion. Either way the result simply appears; a reel of one
      // word is not a reel, and 26 title changes a second is exactly the kind
      // of strobing "reduce motion" is asking us not to do.
      if (pool.length === 0 || reduceMotionRef.current) {
        void request.then(land);
        return;
      }

      let ticksLeft = MIN_TICKS + Math.floor(Math.random() * TICK_SPREAD);
      let delay = FIRST_TICK_MS;
      let index = Math.floor(Math.random() * pool.length);

      const tick = () => {
        // The reel has run its course and the answer is in: stop here, and the
        // real title swaps in as the last and slowest change of all.
        if (ticksLeft <= 0 && outcome.done) {
          land();
          return;
        }

        index = (index + 1) % pool.length;
        setTitle(pool[index]);

        // Once the ticks are spent the reel keeps turning at its final, slowest
        // pace until the request arrives. A draw never ends on a decoy, and a
        // slow network stretches the stop rather than freezing it.
        if (ticksLeft > 0) {
          ticksLeft -= 1;
          delay *= TICK_GROWTH;
        }

        timer.current = setTimeout(tick, delay);
      };

      tick();
    },
    [setTitle]
  );

  return { topic, title, isDrawing, error, draw };
}
