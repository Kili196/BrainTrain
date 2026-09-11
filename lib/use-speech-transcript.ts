import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

// On-device speech-to-text for the recording screen.
//
// Everything here runs through the OS speech recognizer (iOS Speech framework,
// Android SpeechRecognizer) — no audio and no transcript ever leave the phone,
// which is the whole reason we took the custom-dev-build route instead of a
// cloud API. Because it is a native module, this cannot run in Expo Go.
//
// The recognizer will not run in Expo Go — it needs a custom dev build. See the
// README / the note on the recording screen.

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

  useSpeechRecognitionEvent("start", () => setStatus("listening"));

  // "end" fires on a normal stop as well as after an error; don't let it clobber
  // a denied/error status we want to keep showing.
  useSpeechRecognitionEvent("end", () =>
    setStatus((prev) => (prev === "denied" || prev === "error" ? prev : "idle"))
  );

  useSpeechRecognitionEvent("result", (event) => {
    const latest = event.results[0]?.transcript ?? "";
    if (event.isFinal) {
      finalRef.current = `${finalRef.current} ${latest}`.trim();
      setTranscript(finalRef.current);
    } else {
      setTranscript(`${finalRef.current} ${latest}`.trim());
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    // "no-speech" is just a quiet stretch, not a failure — the recognizer emits
    // it when nobody talks for a while. Swallow it so a pause doesn't look broken.
    if (event.error === "no-speech") return;
    setStatus(event.error === "not-allowed" ? "denied" : "error");
    setErrorMessage(event.message);
  });

  const start = useCallback(async () => {
    setErrorMessage(null);

    // Requests mic (+ speech recognition on iOS) the first time; on later calls
    // it resolves immediately with the remembered answer.
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus("denied");
      return;
    }

    ExpoSpeechRecognitionModule.start({
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
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
  }, []);

  // If the screen goes away mid-take, tear the recognizer down hard — abort()
  // drops it without waiting for a final result. Safe to call when idle.
  useEffect(() => () => ExpoSpeechRecognitionModule.abort(), []);

  return { transcript, status, errorMessage, start, stop, reset };
}
