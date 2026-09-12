import "../global.css";

import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/archivo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../lib/auth-context";
import { RoundSessionProvider } from "../lib/round-session";
import { ToastProvider } from "../lib/toast-context";
import { colors } from "../theme/colors";

// Root layout: wraps EVERY route. Renders once and stays mounted around
// whatever screen is active. App-wide setup lives here (the global
// stylesheet, safe-area context, status bar, fonts, and the top-level <Stack>).
export default function RootLayout() {
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
            </Stack>
          </RoundSessionProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
