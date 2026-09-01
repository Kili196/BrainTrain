import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Disclosure chevron (›), trailing. Design §9 puts chevrons at the end of a row
// to say the row leads somewhere — here, into the sheet with the whole
// explanation.
export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9 6l6 6-6 6" />
    </Icon>
  );
}
