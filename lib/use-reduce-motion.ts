import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Whether the device asks for reduced motion ("Reduce Motion" on iOS, "Remove
// animations" on Android). Starts false and flips once the first read comes
// back — the setting is read asynchronously, and one frame of animation before
// it resolves is not worth blocking a screen for.
//
// Subscribes as well as reads, because the setting can be turned on from
// Control Center while the app is in the foreground.
export function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setEnabled(value);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setEnabled
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
