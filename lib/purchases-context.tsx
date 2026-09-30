import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { NativeModules } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

import { useAuth } from "./auth-context";

// Subscriptions, through RevenueCat: one SDK in front of both stores.
//
// Until the store accounts exist this runs on RevenueCat's Test Store — a
// purchase opens a test sheet with "succeed / fail" instead of the real payment
// sheet, but the entitlement it grants is real (it shows up in the dashboard).
// Swapping to the per-store keys later changes the key, not this file.
//
// The player's Supabase user id is their RevenueCat id, so a subscription
// belongs to the account rather than the phone: sign in on a second device
// and premium comes along.
export type PurchasesStatus =
  // Configuring, or fetching the first customer info.
  | "loading"
  | "ready"
  // No native module (an app build from before this SDK was added — Fabian's
  // iPhone until the Apple account exists), no key, or signed out. Everything
  // still works; the player is simply not premium.
  | "unavailable";

export type PurchaseOutcome = "purchased" | "cancelled" | "error";
export type RestoreOutcome = "restored" | "nothing" | "error";

export type PurchasesApi = {
  status: PurchasesStatus;
  isPremium: boolean;
  // The dashboard's current offering (yearly + monthly). Null until loaded, or
  // when it could not be.
  offering: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseOutcome>;
  // Apple requires a visible way to restore on every app that sells
  // subscriptions — a reinstall must not make someone pay twice.
  restore: () => Promise<RestoreOutcome>;
};

// The entitlement id in the RevenueCat dashboard (Product catalog →
// Entitlements). Both products grant it; the app only ever asks about this,
// never about which product was bought.
const ENTITLEMENT = "braintrain_premium";

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY;

// Importing the SDK is safe without its native half; calling it is not. A dev
// build made before `react-native-purchases` was installed has no RNPurchases
// module, and every call would throw — so this is checked once, up front.
const NATIVE_AVAILABLE = NativeModules.RNPurchases != null;

function hasPremium(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT] !== undefined;
}

// The SDK rejects a cancelled purchase like any other failure; telling them
// apart is what keeps "you closed the sheet" from reading as an error.
function wasCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "userCancelled" in error &&
    error.userCancelled === true
  );
}

const Context = createContext<PurchasesApi | null>(null);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();

  const [status, setStatus] = useState<PurchasesStatus>("loading");
  const [isPremium, setIsPremium] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  // `configure` may run once per app launch; a second call is ignored by the
  // SDK with a warning. After that, a different player is a `logIn`.
  const configured = useRef(false);

  useEffect(() => {
    if (!NATIVE_AVAILABLE || !API_KEY || userId === null) {
      setStatus("unavailable");
      setIsPremium(false);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setStatus("loading");
      try {
        if (!configured.current) {
          Purchases.configure({ apiKey: API_KEY, appUserID: userId });
          configured.current = true;
        } else {
          // Sign-out and sign-in without restarting the app: move the SDK to
          // the new account, or the old player's premium would carry over.
          await Purchases.logIn(userId);
        }

        const [info, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (cancelled) return;

        setIsPremium(hasPremium(info));
        setOffering(offerings.current);
        setStatus("ready");
      } catch {
        // Offline at launch, most often. Not premium is the safe default — a
        // paying player gets it back on the next launch with a connection,
        // and the listener below catches it even sooner.
        if (cancelled) return;
        setStatus("unavailable");
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Renewals, expiries and purchases on another device arrive here, so premium
  // flips without the app having to ask again.
  useEffect(() => {
    if (!NATIVE_AVAILABLE || status !== "ready") return;

    const onUpdate = (info: CustomerInfo) => setIsPremium(hasPremium(info));
    Purchases.addCustomerInfoUpdateListener(onUpdate);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(onUpdate);
    };
  }, [status]);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseOutcome> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const premium = hasPremium(customerInfo);
      setIsPremium(premium);
      return premium ? "purchased" : "error";
    } catch (error) {
      return wasCancelled(error) ? "cancelled" : "error";
    }
  }, []);

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    try {
      const info = await Purchases.restorePurchases();
      const premium = hasPremium(info);
      setIsPremium(premium);
      return premium ? "restored" : "nothing";
    } catch {
      return "error";
    }
  }, []);

  const value = useMemo(
    () => ({ status, isPremium, offering, purchase, restore }),
    [status, isPremium, offering, purchase, restore]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePurchases(): PurchasesApi {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("usePurchases must be used within a PurchasesProvider");
  }
  return ctx;
}
