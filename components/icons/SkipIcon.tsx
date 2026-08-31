import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Skip to the end (⏭): two chevrons against a bar. Stroked rather than the
// filled triangles the glyph usually has, so it matches every other icon in the
// app (design §9).
export function SkipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 6l6 6-6 6" />
      <Path d="M12 6l6 6-6 6" />
      <Path d="M19.5 6v12" />
    </Icon>
  );
}
