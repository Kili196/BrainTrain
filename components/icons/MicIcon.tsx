import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Microphone. The one icon the design lets grow to feature size (40–56px,
// design §9) — everywhere else icons stay in the 14–28px range.
export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <Path d="M5 11v1a7 7 0 0 0 14 0v-1" />
      <Path d="M12 19v3" />
    </Icon>
  );
}
