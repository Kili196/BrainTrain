import Svg, { Path } from "react-native-svg";

import { colors } from "../../theme/colors";
import type { IconProps } from "./Icon";

// The Apple logo. A filled glyph rather than the stroked 24-viewBox icons the
// rest of the app uses (design §9 lists the recording dot and radio fills as
// the sanctioned filled exceptions — a brand mark is the same kind of
// exception). It inherits its colour from `color` like every other icon, so it
// stays monochrome and never introduces a hue.
export function AppleIcon({ size = 18, color = colors.text.DEFAULT }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16.37 12.63c-.02-2.06 1.68-3.05 1.76-3.1-0.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.44 2.5-.37 6.2 1.03 8.23.69 1 1.5 2.11 2.57 2.07 1.03-.04 1.42-.66 2.66-.66 1.24 0 1.59.66 2.68.64 1.11-.02 1.81-1.01 2.49-2.01.78-1.15 1.1-2.27 1.12-2.33-.02-.01-2.15-.83-2.17-3.28z" />
      <Path d="M14.32 6.55c.56-.68.94-1.63.84-2.57-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.39-1.13z" />
    </Svg>
  );
}
