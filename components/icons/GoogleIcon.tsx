import { Path } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// The Google "G", drawn monochrome in `currentColor`. Google's own mark is four
// colours, but design §14 forbids introducing a new hue and the login mockup
// itself shows a single-colour G — so this is the stroked outline of the glyph,
// consistent with every other icon in the app rather than the brand's palette.
export function GoogleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {/* The C-shaped arc of the G, left open on the right… */}
      <Path d="M20 12a8 8 0 1 0-3 6.24" />
      {/* …then the horizontal bar closing into the centre. */}
      <Path d="M20 12h-7" />
    </Icon>
  );
}
