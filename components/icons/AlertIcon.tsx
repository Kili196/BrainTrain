import { Circle, Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// A ringed "!", marking a toast that reports a failure.
export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7.5v5.5M12 16.5v.01" />
    </Icon>
  );
}
