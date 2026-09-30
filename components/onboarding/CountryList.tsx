import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import type { Country } from "../../constants/countries";
import { colors } from "../../theme/colors";
import { CheckIcon } from "../icons/CheckIcon";
import { TextField } from "../ui/TextField";
import { Gradient } from "./Gradient";

// Searchable country picker. Search field on top, results in a FlatList (design
// rule: long lists use FlatList, never mapped ScrollViews). The selected row is
// a bordered card with a check; the rest are quiet divider rows.
//
// `selectedFill` is the onboarding's look: the chosen row filled with a
// gradient of that country's own (its flag). Edit Profile leaves it out and
// keeps the app's own bordered row.
export type CountryFill = {
  colors: readonly string[];
  // The label's ink, and the check's — they sit on different ends of the fill.
  ink: string;
  tickInk: string;
};

export type CountryListProps = {
  countries: Country[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  selectedFill?: (code: string) => CountryFill;
};

type CountryRowProps = {
  country: Country;
  selected: boolean;
  onSelect: (code: string) => void;
  selectedFill?: CountryListProps["selectedFill"];
};

function CountryRow({ country, selected, onSelect, selectedFill }: CountryRowProps) {
  if (selectedFill) {
    const fill = selectedFill(country.code);
    return (
      <Pressable
        // A new native view when the row is chosen, not the old one restyled.
        // Android does not draw the gradient's SVG inside a view whose
        // overflow-hidden + radius were switched on after it was created — the
        // row stayed black until the step was left and re-entered (which
        // remounts it). The tiles elsewhere have their clip from the start.
        key={selected ? "on" : "off"}
        onPress={() => onSelect(country.code)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={country.name}
        className={
          selected
            ? "overflow-hidden rounded-[14px] px-4 py-[15px]"
            : "border-t border-ob-border px-4 py-[15px]"
        }
      >
        {selected ? <Gradient angle="across" stops={fill.colors} bands /> : null}
        <View className="flex-row items-center justify-center">
          <Text
            className={`text-center ${selected ? "font-sans-bold" : "font-sans-medium"}`}
            style={{ fontSize: 15, color: selected ? fill.ink : colors.ob.muted }}
          >
            {country.name}
          </Text>
          {selected ? (
            <View className="absolute right-0">
              <CheckIcon size={18} color={fill.tickInk} />
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onSelect(country.code)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={country.name}
      className={
        selected
          ? "rounded-md px-4 py-[15px]"
          : "border-t border-divider px-4 py-[15px]"
      }
      style={
        selected
          ? { borderWidth: 1, borderColor: colors.border.selectedSoft }
          : undefined
      }
    >
      <View className="flex-row items-center justify-center">
        <Text
          className={`text-center ${
            selected
              ? "font-sans-bold text-text"
              : "font-sans-medium text-text-secondary"
          }`}
          style={{ fontSize: 15 }}
        >
          {country.name}
        </Text>
        {selected ? (
          <View className="absolute right-0">
            <CheckIcon size={18} color={colors.accent.light} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function CountryList({
  countries,
  selectedCode,
  onSelect,
  selectedFill,
}: CountryListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [countries, query]);

  return (
    <View className="flex-1">
      <TextField
        variant="search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search country"
        autoCapitalize="none"
        accessibilityLabel="Search country"
      />
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.code}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="mt-3"
        renderItem={({ item }) => (
          <CountryRow
            country={item}
            selected={item.code === selectedCode}
            onSelect={onSelect}
            selectedFill={selectedFill}
          />
        )}
      />
    </View>
  );
}
