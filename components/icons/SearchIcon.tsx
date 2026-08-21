import { Circle, Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Magnifier used inside the country search field.
export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </Icon>
  );
}
