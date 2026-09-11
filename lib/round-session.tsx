import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { randomUUID } from "expo-crypto";

import type { Topic } from "./topics";

// The round, from the moment a topic is drawn until the result has been saved.
//
// The screens already thread what they need through route params, and that
// keeps working — this carries the things a param cannot. `topic_slug` never
// travels with the navigation (only the id and the title do) though the table
// requires it; `started_at` and the spoken duration are decided on the recording
// screen and read two screens later; and the transcript is a page of text, which
// has no business in a URL.
//
// Deliberately not persisted. A round interrupted by the app closing is not one
// worth uploading, and keeping it would mean deciding when it goes stale.
export type RoundSession = {
  // Per round, not per device. `speech_sessions` has a unique index on
  // (user_id, client_id), so a retried upload updates the round it already has
  // rather than leaving a second copy. React Native has no global
  // crypto.randomUUID, which is why this comes from expo-crypto.
  clientId: string;
  topicId: string;
  topicSlug: string;
  title: string;
  // Null until the speaking phase actually starts — the prep timer is not part
  // of the round, and `started_at` in the table means the first spoken word.
  startedAt: string | null;
  spokenMs: number | null;
  // Null is a real answer, not a missing one: no recognizer in Expo Go, a
  // refused microphone, or recognition that failed. The column is nullable for
  // exactly these.
  transcript: string | null;
};

export type RoundSessionApi = {
  // Null between rounds, and on any screen reached by deep link rather than by
  // playing — there is nothing to save then, and the save simply does not run.
  round: RoundSession | null;
  // Called where the whole topic is still in hand. Only Home has the slug.
  begin: (topic: Pick<Topic, "id" | "slug" | "title">) => void;
  // Called once the speaking phase ends, whichever way it ended.
  finishSpeaking: (spoken: {
    startedAt: string;
    spokenMs: number;
    transcript: string | null;
  }) => void;
  // After a successful save, so a round cannot be written twice by going back
  // into the result screen.
  clear: () => void;
};

const Context = createContext<RoundSessionApi | null>(null);

export function RoundSessionProvider({ children }: { children: ReactNode }) {
  const [round, setRound] = useState<RoundSession | null>(null);

  const begin = useCallback((topic: Pick<Topic, "id" | "slug" | "title">) => {
    // Replaces whatever was there. Redrawing a topic starts a new round, and
    // the abandoned one was never saved.
    setRound({
      clientId: randomUUID(),
      topicId: topic.id,
      topicSlug: topic.slug,
      title: topic.title,
      startedAt: null,
      spokenMs: null,
      transcript: null,
    });
  }, []);

  const finishSpeaking = useCallback(
    (spoken: {
      startedAt: string;
      spokenMs: number;
      transcript: string | null;
    }) => {
      // Ignored when there is no round: the recording screen is reachable by
      // deep link, and stamping a round into existence from there would produce
      // one with no topic slug to save under.
      setRound((current) => (current ? { ...current, ...spoken } : null));
    },
    []
  );

  const clear = useCallback(() => setRound(null), []);

  const api = useMemo<RoundSessionApi>(
    () => ({ round, begin, finishSpeaking, clear }),
    [round, begin, finishSpeaking, clear]
  );

  return <Context.Provider value={api}>{children}</Context.Provider>;
}

export function useRoundSession(): RoundSessionApi {
  const value = useContext(Context);

  if (!value) {
    throw new Error(
      "useRoundSession must be used inside a RoundSessionProvider"
    );
  }

  return value;
}
