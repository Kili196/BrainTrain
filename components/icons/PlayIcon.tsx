import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Play — what pause turns into. Stroked and closed rather than filled, so it
// sits at the same visual weight as the pause it replaces.
export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M8 5.5l11 6.5-11 6.5z" />
    </Icon>
  );
}
