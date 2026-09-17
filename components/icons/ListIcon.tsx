import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// The list half of the Knowledge screen's view switch, straight from the
// mockup: three rules, nothing else.
export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  );
}
