import type { ReactNode } from "react";
import Svg from "react-native-svg";

import { colors } from "../../theme/colors";

// Shared base for every icon in the app. Design §9: hand-written 24-viewBox
// stroke SVGs, stroke = currentColor, stroke-width 1.7–2, round line caps.
// Each concrete icon renders its <Path>s as children; this owns the spec so
// sizing and stroke stay consistent everywhere.
export type IconProps = {
  size?: number;
  color?: string;
};

export function Icon({
  size = 22,
  color = colors.text.secondary,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}
