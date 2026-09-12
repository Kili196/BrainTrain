-- What was actually said in a round. The recording screen already transcribes
-- speech on the device, but the text died with the screen — the table kept the
-- topic, the clock and the score, and threw away the one thing a speaker would
-- want to look back at. This is also what a later "analyse my speech" feature
-- has to read: without the words stored there is nothing to analyse after the
-- fact, only in the moment.
--
-- Nullable, because a round without a transcript is still a real round: the
-- recognizer is a native module and is simply absent in Expo Go, the microphone
-- permission can be refused, and the OS recognizer can fail on its own. None of
-- those should stop the round from being saved. Same reasoning as quiz_score,
-- where null means the quiz was skipped.
--
-- Capped rather than free: row level security lets any signed-in user — including
-- an anonymous one, which is every user here — insert their own rows, so an
-- unbounded text column is an open invitation to fill the database. Ten minutes
-- is the longest speaking time the app offers (lib/game-settings.ts), which at a
-- fast 200 words per minute is roughly 12k characters. 32k leaves well over
-- double that and still bounds the damage.
alter table public.speech_sessions
  add column transcript text
    check (char_length(transcript) <= 32000);

comment on column public.speech_sessions.transcript is
  'On-device transcript of the speech. Null when no recognizer was available, the microphone was refused, or recognition failed.';
