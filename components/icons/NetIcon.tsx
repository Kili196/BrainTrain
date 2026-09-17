import { Circle, Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// The net half of the Knowledge screen's view switch: a hub with four nodes
// around it, which is the screen it switches to in miniature.
//
// Stroked, where the mockup draws it filled. Design §9 forbids mixing filled
// and stroked icons, and this one shares a button with `ListIcon` — the two
// swap places in the same 14px box, so a weight change between them would read
// as the button flinching.
export function NetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx="12" cy="12" r="2.6" />
      <Circle cx="5" cy="6" r="1.8" />
      <Circle cx="19" cy="6" r="1.8" />
      <Circle cx="5" cy="18" r="1.8" />
      <Circle cx="19" cy="18" r="1.8" />
      <Path d="M6.4 7.2l3.5 3.2M17.6 7.2l-3.5 3.2M6.4 16.8l3.5-3.2M17.6 16.8l-3.5-3.2" />
    </Icon>
  );
}
