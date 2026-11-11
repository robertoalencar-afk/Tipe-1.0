import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import { C, F } from "@/constants/theme";
import { useGuest } from "@/lib/store";

export default function Abas() {
  const { reservas, fila } = useGuest();
  const ativas = reservas.filter((r) => r.status === "confirmada" || r.status === "chegou" || r.status === "sentada").length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.navy,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
        tabBarStyle: { borderTopColor: C.line, backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Descobrir", tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: "Reservas",
          tabBarBadge: ativas || undefined,
          tabBarBadgeStyle: { backgroundColor: C.teal, color: C.navy },
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fila"
        options={{
          title: "Fila",
          tabBarBadge: fila && (fila.status === "aguardando" || fila.status === "convocado") ? "•" : undefined,
          tabBarBadgeStyle: { backgroundColor: C.teal, color: C.navy },
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
