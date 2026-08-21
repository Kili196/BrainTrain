import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { colors } from "../../theme/colors";
import { SearchIcon } from "../icons/SearchIcon";

// Onboarding text input (design §6). Two shapes:
//  • "input"  — tall, centred text, used for name and the date fields.
//  • "search" — shorter, left-aligned, with a leading magnifier.
// The border is a quiet white hairline that turns accent-blue on focus, which
// is the only affordance the design uses to show focus.
export type TextFieldProps = {
  variant?: "input" | "search";
} & Pick<
  TextInputProps,
  | "value"
  | "onChangeText"
  | "placeholder"
  | "keyboardType"
  | "maxLength"
  | "autoCapitalize"
  | "autoFocus"
  | "returnKeyType"
  | "onSubmitEditing"
  | "accessibilityLabel"
  | "textAlign"
>;

export function TextField({ variant = "input", ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const isSearch = variant === "search";

  return (
    <View
      className={
        isSearch
          ? "flex-row items-center gap-[10px] rounded-sm bg-card-alt px-[14px] py-[11px]"
          : "rounded-md bg-card-alt px-[18px] py-[17px]"
      }
      style={{
        borderWidth: 1,
        borderColor: focused ? colors.accent.DEFAULT : "rgba(255,255,255,0.12)",
      }}
    >
      {isSearch ? <SearchIcon size={16} color={colors.text.muted} /> : null}
      <TextInput
        {...inputProps}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.text.disabled}
        selectionColor={colors.accent.light}
        textAlign={inputProps.textAlign ?? (isSearch ? "left" : "center")}
        className={
          isSearch
            ? "flex-1 font-sans-medium text-text"
            : "font-sans-semibold text-text"
        }
        style={{ fontSize: isSearch ? 15 : 17, padding: 0 }}
      />
    </View>
  );
}
