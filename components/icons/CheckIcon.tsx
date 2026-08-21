import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Checkmark (✓) marking the selected country row.
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 12.5l4.5 4.5L19 6.5" />
    </Icon>
  );
}
