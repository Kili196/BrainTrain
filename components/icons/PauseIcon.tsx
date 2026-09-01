import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Pause. Two strokes rather than two filled bars: design §9 keeps every icon in
// the app stroked, and at 28px a round-capped 1.8 stroke reads as a bar anyway.
export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9.5 5v14" />
      <Path d="M14.5 5v14" />
    </Icon>
  );
}
