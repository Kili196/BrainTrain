import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "../../components/ui/Button";
import { clearOnboarding } from "../../lib/onboarding-storage";
import { fetchRandomTopic, type Topic } from "../../lib/topics";

// Home, first slice: PLAY draws a random topic from the backend and puts it on
// the stage. Everything else from the design (wordmark, achievements/challenges
// row, mode pills, constellation backdrop) is deliberately not here yet.
export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [isDrawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draw = async () => {
    // Guard against a double tap firing two draws — the second result would
    // overwrite the first and the topic would visibly flicker.
    if (isDrawing) return;

    setDrawing(true);
    setError(null);

    try {
      const next = await fetchRandomTopic();
      setTopic(next);

      if (!next) {
        setError("No topics available yet.");
      }
    } catch (cause) {
      // The thrown message already says what failed; the topic on screen stays
      // put so a failed draw doesn't wipe what the user was looking at.
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setDrawing(false);
    }
  };

  const reset = async () => {
    await clearOnboarding();
    router.replace("/welcome");
  };

  return (
    <View
      className="flex-1 bg-bg px-5"
      style={{ paddingTop: insets.top + 44, paddingBottom: insets.bottom + 30 }}
    >
      {/* the stage: one topic, centred, filling the space above the button */}
      <View className="flex-1 items-center justify-center">
        {topic ? (
          <Text className="text-center text-display font-sans-extrabold uppercase text-text">
            {topic.title}
          </Text>
        ) : (
          <Text className="text-center text-display font-sans-extrabold uppercase text-text-disabled">
            Your topic
          </Text>
        )}

        {error ? (
          <Text className="mt-4 text-center text-body font-sans text-error">
            {error}
          </Text>
        ) : null}
      </View>

      <Button
        label={isDrawing ? "Drawing…" : "Play"}
        onPress={draw}
        disabled={isDrawing}
        variant="hero"
        accessibilityLabel="Play — draw a random topic"
      />

      {/* Dev convenience: re-run onboarding without reinstalling. Ghost styling
          on purpose — the screen may only ever have one filled button. */}
      <Pressable
        onPress={reset}
        accessibilityRole="button"
        className="mt-6 self-center py-2"
      >
        <Text className="text-body font-sans-bold text-text-muted">
          Reset onboarding
        </Text>
      </Pressable>
    </View>
  );
}
