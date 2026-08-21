import { View } from "react-native";

import { TextField } from "../ui/TextField";

// Birthdate entry as three separate numeric fields (design §6: date is DD / MM /
// YYYY in a row). Fully controlled — validation and the helper line live on the
// screen, so this component only captures digits.
export type DateParts = {
  day: string;
  month: string;
  year: string;
};

export type DateInputProps = {
  value: DateParts;
  onChange: (next: DateParts) => void;
};

// Keep only digits so paste / autofill can't sneak in stray characters.
const digitsOnly = (text: string) => text.replace(/[^0-9]/g, "");

export function DateInput({ value, onChange }: DateInputProps) {
  return (
    <View className="flex-row gap-[10px]">
      <View className="flex-1">
        <TextField
          value={value.day}
          onChangeText={(t) => onChange({ ...value, day: digitsOnly(t) })}
          placeholder="DD"
          keyboardType="number-pad"
          maxLength={2}
          accessibilityLabel="Day of birth"
        />
      </View>
      <View className="flex-1">
        <TextField
          value={value.month}
          onChangeText={(t) => onChange({ ...value, month: digitsOnly(t) })}
          placeholder="MM"
          keyboardType="number-pad"
          maxLength={2}
          accessibilityLabel="Month of birth"
        />
      </View>
      <View className="flex-[1.4]">
        <TextField
          value={value.year}
          onChangeText={(t) => onChange({ ...value, year: digitsOnly(t) })}
          placeholder="YYYY"
          keyboardType="number-pad"
          maxLength={4}
          accessibilityLabel="Year of birth"
        />
      </View>
    </View>
  );
}
