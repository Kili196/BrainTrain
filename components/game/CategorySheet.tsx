import { Pressable, Text } from "react-native";

import { Sheet, SheetRow } from "../ui/Sheet";
import { categories, type CategoryKey } from "../../constants/categories";

// Picks which category the topic is drawn from. The list comes from
// constants/categories.ts, which mirrors what actually exists in the database —
// there is no "all" entry here, because that is what the Random mode is.
export type CategorySheetProps = {
  visible: boolean;
  selected: CategoryKey | null;
  onSelect: (key: CategoryKey) => void;
  onClose: () => void;
};

export function CategorySheet({
  visible,
  selected,
  onSelect,
  onClose,
}: CategorySheetProps) {
  return (
    <Sheet visible={visible} title="Choose category" onClose={onClose}>
      {categories.map((category) => {
        const isSelected = category.key === selected;

        return (
          <SheetRow key={category.key}>
            <Pressable
              onPress={() => onSelect(category.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={category.name}
              // Fills the row so the whole width is tappable, not just the text.
              className="w-full"
            >
              <Text
                className={`text-h4 ${
                  isSelected
                    ? "font-sans-bold text-text"
                    : "font-sans-medium text-text-secondary"
                }`}
              >
                {category.name}
              </Text>
            </Pressable>
          </SheetRow>
        );
      })}
    </Sheet>
  );
}
