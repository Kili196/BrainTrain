import { useEffect, useState } from "react";

// Seconds left until `endAt`, or null when no countdown is running.
//
// The deadline is a timestamp and every tick is derived from it, rather than
// counting an interval down. Two reasons, and both actually happen: a busy JS
// thread makes setInterval fire late and a counter would quietly lose time, and
// a backgrounded app has its timers throttled or stopped entirely — a counter
// would come back minutes behind, while a deadline is simply read again and is
// instantly right.
//
// Ticks faster than once a second so the displayed second turns within a
// quarter of its boundary rather than drifting up to a full second late. The
// extra ticks cost nothing: the value is only committed when the whole second
// actually changes.
const TICK_MS = 250;

export function useCountdown(endAt: number | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (endAt === null) {
      setRemaining(null);
      return;
    }

    // Ceil, so a deadline 200ms away still reads as "1" and the display only
    // reaches zero when the time is genuinely up.
    const read = () => Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

    setRemaining(read());

    const id = setInterval(() => {
      setRemaining((current) => {
        const next = read();
        return next === current ? current : next;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [endAt]);

  return remaining;
}
