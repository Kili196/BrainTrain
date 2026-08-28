import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Two flags, shared between Home and the tab layout around it.
//
// `starting` means "a round is beginning", not "an animation is playing" — it
// is what makes the chrome leave the screen and the stage grow, and anything
// else that should step back during a draw can read it too.
//
// `fading` raises the black layer over everything, including the tab bar. That
// layer cannot live inside Home: the tab bar is rendered by the navigator
// around it, and a view inside a tab screen can never cover it. So both flags
// live at the layout, and Home reaches up here to set them.
export type RoundStart = {
  starting: boolean;
  fading: boolean;
  setStarting: (value: boolean) => void;
  setFading: (value: boolean) => void;
};

const Context = createContext<RoundStart | null>(null);

// Called by the layout, which needs the values itself (for the tab bar and the
// black layer) as well as passing them down.
export function useRoundStartState(): RoundStart {
  const [starting, setStarting] = useState(false);
  const [fading, setFading] = useState(false);

  return useMemo(
    () => ({ starting, fading, setStarting, setFading }),
    [starting, fading]
  );
}

export function RoundStartProvider({
  value,
  children,
}: {
  value: RoundStart;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRoundStart(): RoundStart {
  const value = useContext(Context);

  if (!value) {
    throw new Error("useRoundStart must be used inside a RoundStartProvider");
  }

  return value;
}
