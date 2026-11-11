import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { localTime, RESERVATION_STATUS_LABEL } from "@core/reservas";
import { C, R, S } from "@/constants/theme";
import { Botao, T, st } from "@/components/ui";
import { restaurante } from "@/lib/demo";
import { useGuest } from "@/lib/store";

export default function Reservas() {
  const { reservas } = useGuest();
  const proximas = reservas.filter((r) => ["confirmada", "chegou", "sentada", "pendente"].includes(r.status));
  const passadas = reservas.filter((r) => !proximas.includes(r));
  return (
    <SafeAreaView style={st.tela} edges={["top"]}>
      <ScrollView contentContainerStyle={st.conteudo}>
        <T tom="titulo">Reservas</T>
        {!reservas.length && (
          <View style={{ alignItems: "center", gap: S.md, paddingVertical: 48 }}>
            <Ionicons name="calendar-clear-outline" size={44} color={C.muted} />
            <T tom="h3">Nenhuma reserva ainda</T>
            <T tom="pequeno" cor={C.muted} style={{ textAlign: "center" }}>
              Escolha um restaurante, o dia e o horário. Sua reserva aparece aqui.
            </T>
            <Botao tipo="escuro" onPress={() => router.navigate("/")}>
              Descobrir restaurantes
            </Botao>
          </View>
        )}
        {[
          ["Próximas", proximas],
          ["Anteriores", passadas],
        ].map(([titulo, lista]) =>
          (lista as typeof reservas).length ? (
            <View key={titulo as string} style={{ gap: S.sm }}>
              <T tom="rotulo" cor={C.muted}>
                {(titulo as string).toUpperCase()}
              </T>
              {(lista as typeof reservas).map((x) => {
                const r = restaurante(x.restauranteId);
                const d = new Date(x.inicio);
                return (
                  <Pressable
                    key={x.codigo}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: "/reserva/[codigo]", params: { codigo: x.codigo } })}
                    style={{ flexDirection: "row", gap: S.md, alignItems: "center", padding: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.line }}
                  >
                    <Image source={r.foto} style={{ width: 64, height: 64, borderRadius: R.md }} contentFit="cover" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T tom="h3">{r.nome}</T>
                      <T tom="pequeno" cor={C.muted}>
                        {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Fortaleza" })} · {localTime(d)} ·{" "}
                        {x.pessoas} pessoas
                      </T>
                      <T tom="rotulo" cor={C.tealDark}>
                        {RESERVATION_STATUS_LABEL[x.status]}
                      </T>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.muted} />
                  </Pressable>
                );
              })}
            </View>
          ) : null,
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
