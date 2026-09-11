import { useCallback, useEffect, useRef, useState } from "react";

// On-device speech-to-text for the recording screen.
//
// Everything here runs through the OS speech recognizer (iOS Speech framework,
// Android SpeechRecognizer) — no audio and no transcript ever leave the phone,
// which is the whole reason we took the custom-dev-build route instead of a
// cloud API. Because it is a native module, this cannot run in Expo Go.
//
// The recognizer will not run in Expo Go — it needs a custom dev build. See the
// README / the note on the recording screen.

// The package binds to the native recognizer at import time: its top-level
// requireNativeModule throws when the module is not in the binary, which in
// Expo Go is always. A static import would therefore take the recording screen
// down before any of our code ran — including the "needs a dev build" message
// the screen is already able to show. Going through require inside a try/catch
// turns that crash into a null we can branch on, which is what keeps the rest
// of the app usable in Expo Go while the microphone is not.
type SpeechModule = typeof import("expo-speech-recognition");

const speech: SpeechModule | null = (() => {
  try {
    return require("expo-speech-recognition");
  } catch {
    return null;
  }
})();

// "listening" once the recognizer is capturing; "denied" when the user refused
// the mic/speech permission; "error" for anything else (no recognizer, network
// on a network-only locale, …). "idle" is both the start state and the resting
// state between takes.
export type TranscriptStatus = "idle" | "listening" | "denied" | "error";

export function useSpeechTranscript() {
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<TranscriptStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Finalised speech accumulates here and survives pause/resume, so stopping to
  // pause the clock and starting again keeps appending rather than wiping what
  // was already said. The live (interim) words are shown on top of this but are
  // never committed until the recognizer marks a result final — otherwise a
  // half-heard guess would stick around after it was corrected.
  const finalRef = useRef("");

  // All four listeners in one subscription rather than through the package's
  // useSpeechRecognitionEvent, which would re-introduce the very import avoided
  // above. Each addListener is called with a literal event name, so every
  // payload below is typed by the recognizer's own event map. They are set up
  // once: the callbacks only reach for setState and a ref, both of which are
  // stable, so there is nothing a later render could make them miss.
  useEffect(() => {
    if (!speech) return;

    const recognizer = speech.ExpoSpeechRecognitionModule;

    const subscriptions = [
      recognizer.addListener("start", () => setStatus("listening")),

      // "end" fires on a normal stop as well as after an error; don't let it
      // clobber a denied/error status we want to keep showing.
      recognizer.addListener("end", () =>
        setStatus((prev) =>
          prev === "denied" || prev === "error" ? prev : "idle"
        )
      ),

      recognizer.addListener("result", (event) => {
        const latest = event.results[0]?.transcript ?? "";
        if (event.isFinal) {
          finalRef.current = `${finalRef.current} ${latest}`.trim();
          setTranscript(finalRef.current);
        } else {
          setTranscript(`${finalRef.current} ${latest}`.trim());
        }
      }),

      recognizer.addListener("error", (event) => {
        // "no-speech" is just a quiet stretch, not a failure — the recognizer
        // emits it when nobody talks for a while. Swallow it so a pause does
        // not look broken.
        if (event.error === "no-speech") return;
        setStatus(event.error === "not-allowed" ? "denied" : "error");
        setErrorMessage(event.message);
      }),
    ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);

    // No native recognizer — Expo Go, or a dev build made before the plugin was
    // added. Reported as an error so the transcript card says so, and nothing
    // more: the round still runs, it just produces no transcript.
    if (!speech) {
      setStatus("error");
      return;
    }

    // Requests mic (+ speech recognition on iOS) the first time; on later calls
    // it resolves immediately with the remembered answer.
    const permission =
      await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus("denied");
      return;
    }

    speech.ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      // Show words as they are recognised rather than only at the end of a
      // sentence — the point of the screen is to watch the transcript build.
      interimResults: true,
      // Keep listening across pauses in speech instead of stopping at the first
      // silence, so one take is one continuous transcript.
      continuous: true,
      addsPunctuation: true,
    });
  }, []);

  const stop = useCallback(() => {
    speech?.ExpoSpeechRecognitionModule.stop();
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
  }, []);

  // If the screen goes away mid-take, tear the recognizer down hard — abort()
  // drops it without waiting for a final result. Safe to call when idle.
  useEffect(() => () => speech?.ExpoSpeechRecognitionModule.abort(), []);

  return { transcript, status, errorMessage, start, stop, reset };
}
