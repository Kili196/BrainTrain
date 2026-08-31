import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Forward arrow (→). With a shaft rather than a bare chevron: a chevron reads
// as "there is more below/beside this", an arrow as "this takes you onward",
// and on a button that difference is the whole message.
export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 12h16" />
      <Path d="M13 5l7 7-7 7" />
    </Icon>
  );
}
