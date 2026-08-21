import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import type { Country } from "../../constants/countries";
import { colors } from "../../theme/colors";
import { CheckIcon } from "../icons/CheckIcon";
import { TextField } from "../ui/TextField";

// Searchable country picker. Search field on top, results in a FlatList (design
// rule: long lists use FlatList, never mapped ScrollViews). The selected row is
// a bordered card with a check; the rest are quiet divider rows.
export type CountryListProps = {
  countries: Country[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
};

function CountryRow({
  country,
  selected,
  onSelect,
}: {
  country: Country;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
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
          ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.45)" }
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
          />
        )}
      />
    </View>
  );
}
