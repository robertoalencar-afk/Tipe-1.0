import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { addDays, localDay, localTime } from "@core/reservas";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, F, R, S } from "@/constants/theme";
import { Selo, T, st, toque } from "@/components/ui";
import { brl, horariosPerto, RESERVADO_HOJE, RESTAURANTES } from "@/lib/demo";
import { useGuest } from "@/lib/store";

const FILTROS = ["Todos", "Hoje à noite", "Com garantia", "Sem garantia", "Fundadores"] as const;

export default function Descobrir() {
  const { nome, favoritos } = useGuest();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Todos");
  const [pessoas, setPessoas] = useState(2);
  const [alvo, setAlvo] = useState("20:00");
  const dia = addDays(localDay(new Date()), 1);
  const lista = RESTAURANTES.filter((r) => `${r.nome} ${r.tipo} ${r.bairro}`.toLowerCase().includes(busca.trim().toLowerCase())).filter(
    (r) =>
      filtro === "Todos" ||
      (filtro === "Hoje à noite" && r.turnos.some(([, b]) => b >= "21:00")) ||
      (filtro === "Com garantia" && r.garantiaPorPessoa > 0) ||
      (filtro === "Sem garantia" && r.garantiaPorPessoa === 0) ||
      (filtro === "Fundadores" && r.fundador),
  );
  return (
    <SafeAreaView style={st.tela} edges={["top"]}>
      <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <T tom="pequeno" cor={C.muted}>
            Olá, {nome} · Fortaleza
          </T>
          <T tom="titulo">Onde vamos comer?</T>
        </View>
        <View style={s.busca}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Restaurante, cozinha ou bairro"
            placeholderTextColor={C.muted}
            accessibilityLabel="Buscar restaurante"
            style={s.input}
          />
        </View>
        <View style={s.seletor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${pessoas} pessoas, toque para mudar`}
            onPress={() => {
              toque();
              setPessoas((p) => (p >= 6 ? 1 : p + 1));
            }}
            style={s.seletorItem}
          >
            <Ionicons name="people-outline" size={16} color={C.navy} />
            <T tom="h3">{pessoas} {pessoas === 1 ? "pessoa" : "pessoas"}</T>
          </Pressable>
          <View style={s.divisor} />
          <View style={s.seletorItem}>
            <Ionicons name="calendar-outline" size={16} color={C.navy} />
            <T tom="h3">Amanhã</T>
          </View>
          <View style={s.divisor} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Por volta das ${alvo}, toque para mudar`}
            onPress={() => {
              toque();
              setAlvo((a) => ({ "12:30": "19:30", "19:30": "20:00", "20:00": "21:00", "21:00": "12:30" })[a] ?? "20:00");
            }}
            style={s.seletorItem}
          >
            <Ionicons name="time-outline" size={16} color={C.navy} />
            <T tom="h3">{alvo}</T>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          {FILTROS.map((f) => (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: filtro === f }}
              onPress={() => {
                toque();
                setFiltro(f);
              }}
              style={[s.filtro, filtro === f && { backgroundColor: C.navy, borderColor: C.navy }]}
            >
              <T tom="rotulo" cor={filtro === f ? "#fff" : C.navy}>
                {f}
              </T>
            </Pressable>
          ))}
        </ScrollView>

        {lista.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${r.nome}, ${r.tipo}, ${r.bairro}, nota ${r.nota}`}
            onPress={() => router.push({ pathname: "/restaurante/[id]", params: { id: r.id } })}
            style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
          >
            <Image source={r.foto} style={s.foto} contentFit="cover" transition={200} />
            <View style={s.sobreFoto}>
              {r.fundador && <Selo>Fundador</Selo>}
              {favoritos.includes(r.id) && (
                <View style={s.coracao}>
                  <Ionicons name="heart" size={16} color="#E5484D" />
                </View>
              )}
            </View>
            <View style={{ padding: S.lg, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <T tom="h2">{r.nome}</T>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={14} color={C.star} />
                  <T tom="h3">{r.nota}</T>
                </View>
              </View>
              <T tom="pequeno" cor={C.muted}>
                {r.tipo} · {r.bairro} · {r.preco} · {r.avaliacoes} avaliações
              </T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="trending-up" size={14} color={C.tealDark} />
                <T tom="pequeno" cor={C.tealDark}>
                  Reservado {RESERVADO_HOJE[r.id] ?? 0} vezes hoje
                </T>
              </View>
              <View style={{ flexDirection: "row", gap: S.sm, marginTop: 6 }}>
                {horariosPerto(r, dia, pessoas, alvo).map((h) => (
                  <Pressable
                    key={h.toISOString()}
                    accessibilityRole="button"
                    accessibilityLabel={`Reservar ${r.nome} às ${localTime(h)}`}
                    onPress={() => {
                      toque();
                      router.push({ pathname: "/reservar", params: { id: r.id, inicio: h.toISOString(), pessoas: String(pessoas) } });
                    }}
                    style={({ pressed }) => [s.horario, pressed && { backgroundColor: C.tealDark }]}
                  >
                    <T tom="h3" cor="#fff">
                      {localTime(h)}
                    </T>
                  </Pressable>
                ))}
                {!horariosPerto(r, dia, pessoas, alvo).length && (
                  <T tom="pequeno" cor={C.muted}>
                    Sem mesa perto desse horário. Toque para ver o dia todo.
                  </T>
                )}
              </View>
              <T tom="pequeno" cor={C.muted} style={{ marginTop: 2 }}>
                {r.garantiaPorPessoa > 0
                  ? `Garantia de ${brl(r.garantiaPorPessoa)} por pessoa, vira crédito na conta`
                  : "Reserva sem garantia"}
              </T>
            </View>
          </Pressable>
        ))}
        {!lista.length && (
          <T tom="corpo" cor={C.muted} style={{ textAlign: "center", paddingVertical: 32 }}>
            Nenhum restaurante com esse filtro. Tente outra busca.
          </T>
        )}
        <T tom="pequeno" cor={C.muted} style={{ textAlign: "center" }}>
          Modo demonstração: restaurantes fictícios, nenhuma cobrança real.
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  busca: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.bgSoft,
    borderRadius: R.pill,
    paddingHorizontal: S.lg,
    minHeight: 48,
  },
  input: { flex: 1, fontFamily: F.regular, fontSize: 15, color: C.text, paddingVertical: 12 },
  filtro: { minHeight: 36, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, justifyContent: "center" },
  card: { borderRadius: R.lg, overflow: "hidden", backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  foto: { width: "100%", aspectRatio: 16 / 9, backgroundColor: C.bgSoft },
  seletor: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.line, borderRadius: R.md, minHeight: 48 },
  seletorItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48 },
  divisor: { width: 1, height: 24, backgroundColor: C.line },
  horario: { flex: 1, minHeight: 40, maxWidth: 96, borderRadius: R.sm, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  sobreFoto: { position: "absolute", top: S.md, left: S.md, right: S.md, flexDirection: "row", justifyContent: "space-between" },
  coracao: { backgroundColor: "#fff", borderRadius: R.pill, padding: 6 },
});
