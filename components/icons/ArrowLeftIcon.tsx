import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Back arrow (←) used in the onboarding header.
export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M15 6l-6 6 6 6" />
    </Icon>
  );
}
