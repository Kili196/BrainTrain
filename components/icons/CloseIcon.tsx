import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// × for dismissing a popover.
export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}
