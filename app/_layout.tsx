import "../global.css";

import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/archivo";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../lib/auth-context";
import { PurchasesProvider } from "../lib/purchases-context";
import { RoundSessionProvider } from "../lib/round-session";
import { ToastProvider } from "../lib/toast-context";
import { colors } from "../theme/colors";

// Crash reporting, at module scope so it is running before the first render can
// throw. Off in development: Metro already shows those errors on screen, and
// every emulator crash would eat the free tier's quota. Off as well without a
// DSN, so a checkout with no Sentry entry in .env runs exactly as before. Crashes
// only — no performance tracing, no session replay — and no personal data such
// as IP addresses, so the privacy policy only has to name crash reports.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn: sentryDsn,
  enabled: !__DEV__ && Boolean(sentryDsn),
  sendDefaultPii: false,
});

// Root layout: wraps EVERY route. Renders once and stays mounted around
// whatever screen is active. App-wide setup lives here (the global
// stylesheet, safe-area context, status bar, fonts, and the top-level <Stack>).
function RootLayout() {
  // Load each Archivo weight under its own family name — the tailwind config
  // maps these to font-sans / font-sans-extrabold etc. Until they resolve we
  // render nothing so text never flashes in the system font first.
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* Above everything: no screen may run before there is an account, or the
          app would look like it works while nothing can be saved. Inside the
          safe-area provider, because its retry screen needs the insets. */}
      <AuthProvider>
        {/* Under auth, because a subscription belongs to the account: the
            RevenueCat user is the Supabase user. */}
        <PurchasesProvider>
          {/* Around the Stack, so a confirmation raised on one screen can be read
              on the next one. */}
          <ToastProvider>
            {/* A round outlives every screen it passes through — drawn on Home,
                spoken on recording, saved on the result — so it cannot live in
                any one of them. */}
            <RoundSessionProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                {/* Every screen is near-black, so a cross-fade reads much like the
                    black veil the design calls for (§12) without a custom layer.
                    The veil itself is an app-wide pattern and should land once,
                    across all navigation, rather than on this one route. */}
                <Stack.Screen name="play" options={{ animation: "fade" }} />
                <Stack.Screen name="recording" options={{ animation: "fade" }} />
                <Stack.Screen name="quiz-intro" options={{ animation: "fade" }} />
                <Stack.Screen name="quiz" options={{ animation: "fade" }} />
                <Stack.Screen name="analyzing" options={{ animation: "fade" }} />
                <Stack.Screen name="quiz-result" options={{ animation: "fade" }} />
                <Stack.Screen name="edit-profile" options={{ animation: "fade" }} />
                <Stack.Screen name="paywall" options={{ animation: "fade" }} />
              </Stack>
            </RoundSessionProvider>
          </ToastProvider>
        </PurchasesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// The wrapper adds an error boundary and touch breadcrumbs around the whole app,
// so a report shows what the player tapped just before the crash.
export default Sentry.wrap(RootLayout);
