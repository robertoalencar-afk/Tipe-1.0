import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
  useFonts,
} from "@expo-google-fonts/inter-tight";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { C, F } from "@/constants/theme";
import { GuestProvider } from "@/lib/store";

void SplashScreen.preventAutoHideAsync();

export default function Raiz() {
  const [ok] = useFonts({ InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold });
  useEffect(() => {
    if (ok) void SplashScreen.hideAsync();
  }, [ok]);
  if (!ok) return null;
  return (
    <GuestProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: C.navy,
          headerTitleStyle: { fontFamily: F.semibold, color: C.navy },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="restaurante/[id]" options={{ title: "", headerTransparent: true }} />
        <Stack.Screen name="reservar" options={{ title: "Confirmar reserva", presentation: "modal" }} />
        <Stack.Screen name="reserva/[codigo]" options={{ title: "Sua reserva" }} />
        <Stack.Screen name="mesa/[codigo]" options={{ title: "Mesa" }} />
      </Stack>
    </GuestProvider>
  );
}
