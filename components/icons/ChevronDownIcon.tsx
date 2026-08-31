import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Disclosure chevron (⌄). Points down when a section is closed; the panel that
// owns it turns it over as it opens.
export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M6 9l6 6 6-6" />
    </Icon>
  );
}
