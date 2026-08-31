import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Toast } from "../components/ui/Toast";

// App-wide confirmations, raised from anywhere and rendered once at the root.
//
// It has to live above the navigator because a message routinely outlives the
// screen that raised it: the round is saved on the result screen, and the
// confirmation is read on Home a moment later. A toast rendered inside a screen
// would leave with it.
export type ToastApi = {
  show: (message: string) => void;
};

const Context = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  // A counter beside the text: raising the same message twice has to restart
  // the toast, and identical state would otherwise change nothing.
  const [toast, setToast] = useState<{ message: string; key: number } | null>(
    null
  );

  const api = useMemo<ToastApi>(
    () => ({
      show: (message) =>
        setToast((current) => ({ message, key: (current?.key ?? 0) + 1 })),
    }),
    []
  );

  return (
    <Context.Provider value={api}>
      {children}

      {/* After the children, so it paints over every screen. Keyed, so a new
          message remounts the toast and its timer starts again. */}
      <Toast
        key={toast?.key}
        message={toast?.message ?? null}
        onDismiss={() => setToast(null)}
      />
    </Context.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(Context);

  if (!value) {
    throw new Error("useToast must be used inside a ToastProvider");
  }

  return value;
}
