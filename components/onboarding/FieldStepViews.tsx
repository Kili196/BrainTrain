import { Text, View } from "react-native";

import type { CountryStep, DateStep, TextStep } from "../../constants/onboarding-steps";
import { countries } from "../../constants/countries";
import { isBirthFilled, isValidBirth } from "../../lib/birthdate";
import { mixHex } from "../../lib/mix-hex";
import { useOnboarding } from "../../lib/onboarding-context";
import { colors } from "../../theme/colors";
import { TextField } from "../ui/TextField";
import { CountryList, type CountryFill } from "./CountryList";
import { DateInput } from "./DateInput";

// The three questions the app has always asked — name, birthdate, country — in
// one file, because each is only a thin wrapper that hands the shared context
// to a control that already existed before this flow did.

export type TextStepViewProps = {
  step: TextStep;
  // Return on the keyboard moves on, the same as the button under it.
  onSubmit: () => void;
};

export function TextStepView({ step, onSubmit }: TextStepViewProps) {
  const { answers, set } = useOnboarding();

  return (
    <View className="pt-8">
      <TextField
        value={answers.name}
        onChangeText={(text) => set(step.key, text)}
        placeholder={step.placeholder}
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        accessibilityLabel={step.placeholder}
      />
    </View>
  );
}

export type DateStepViewProps = {
  step: DateStep;
};

export function DateStepView({ step }: DateStepViewProps) {
  const { answers, set } = useOnboarding();
  // Only once all three are filled: a half-typed date is a normal state, not
  // an error, and the disabled button already says "not yet".
  const showInvalid = isBirthFilled(answers.birth) && !isValidBirth(answers.birth);

  return (
    <View className="gap-3 pt-8">
      <DateInput value={answers.birth} onChange={(birth) => set(step.key, birth)} />
      {showInvalid ? (
        <Text className="text-center text-caption font-sans text-text-muted">
          {step.invalid}
        </Text>
      ) : null}
    </View>
  );
}

// The chosen row wears its own flag, left to right (Fabian, 2026-09-30).
// Countries without a flag entry fall back to the subject arc, the gradient
// family of every other choice in this flow.
const FLAGS: Readonly<Record<string, readonly string[]>> = colors.ob.flag;
const ARC = Object.values(colors.ob.subject);

// The colour a gradient shows at `t` (0–1) along its stops.
function colorAt(stops: readonly string[], t: number): string {
  const at = t * (stops.length - 1);
  const i = Math.min(Math.floor(at), stops.length - 2);
  return mixHex(stops[i], stops[i + 1], at - i);
}

// Dark ink on a light colour, white on a dark one. Flags run from white (Japan,
// Finland) to near-black (Germany), so no single ink reads on all of them.
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const light = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return light > 0.6 ? colors.ob.bg : colors.ob.text;
}

// The label sits in the middle of the row and the check at its right end, so
// each takes its ink from the colour underneath it rather than from the flag
// as a whole — Japan's name sits on red, its check on white.
function countryFill(code: string): CountryFill {
  const stops = FLAGS[code] ?? ARC;
  return {
    colors: stops,
    ink: inkOn(colorAt(stops, 0.5)),
    tickInk: inkOn(stops[stops.length - 1]),
  };
}

export type CountryStepViewProps = {
  step: CountryStep;
};

export function CountryStepView({ step }: CountryStepViewProps) {
  const { answers, set } = useOnboarding();

  // flex-1 so the list fills what is left and scrolls on its own — it is a
  // FlatList, which must not sit inside the shell's ScrollView.
  return (
    <View className="flex-1 pt-7">
      <CountryList
        countries={countries}
        selectedCode={answers.countryCode}
        onSelect={(code) => set(step.key, code)}
        selectedFill={countryFill}
      />
    </View>
  );
}
