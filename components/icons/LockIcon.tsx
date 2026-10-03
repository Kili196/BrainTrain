import { Path, Rect } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// A closed padlock, for anything that needs Pro.
export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x={5} y={11} width={14} height={10} rx={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  );
}
