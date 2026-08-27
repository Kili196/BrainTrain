import { Circle, Line } from "react-native-svg";

import { Icon, type IconProps } from "./Icon";

// Settings gear: a hub, a body ring and eight teeth. Drawn from computed angles
// rather than one long hand-tuned path — the teeth stay evenly spaced, and the
// count is one number to change.
const TEETH = 8;
const CENTER = 12;
const TOOTH_INNER = 6.4;
const TOOTH_OUTER = 8.4;

export function GearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={CENTER} cy={CENTER} r={2.6} />
      <Circle cx={CENTER} cy={CENTER} r={6.2} />
      {Array.from({ length: TEETH }, (_, index) => {
        const angle = (index * 2 * Math.PI) / TEETH;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        return (
          <Line
            key={index}
            x1={CENTER + dx * TOOTH_INNER}
            y1={CENTER + dy * TOOTH_INNER}
            x2={CENTER + dx * TOOTH_OUTER}
            y2={CENTER + dy * TOOTH_OUTER}
          />
        );
      })}
    </Icon>
  );
}
