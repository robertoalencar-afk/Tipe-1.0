import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { addDays, localDay, localTime } from "@core/reservas";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, F, R, S } from "@/constants/theme";
import { Selo, T, st, toque } from "@/components/ui";
import { brl, horariosCartao, perguntarLebre, RESERVADO_HOJE, RESTAURANTES, SUGESTOES_LEBRE, type Restaurante } from "@/lib/demo";
import { fmtPontos, horarioCalmo, BONUS_HORARIO_CALMO } from "@/lib/pontos";
import { Mapa } from "@/components/Mapa";
import { useGuest } from "@/lib/store";

const FILTROS = ["Todos", "Hoje à noite", "Com garantia", "Sem garantia", "Fundadores"] as const;

export default function Descobrir() {
  const { nome, favoritos, alternarFavorito, pontos } = useGuest();
  const [modo, setModo] = useState<"lista" | "mapa">("lista");
  const [pergunta, setPergunta] = useState<string | null>(null);
  const [sel, setSel] = useState<string>("mare");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Todos");
  const [pessoas, setPessoas] = useState(2);
  const [alvo, setAlvo] = useState("20:00");
  const dia = addDays(localDay(new Date()), 1);
  const base = pergunta ? perguntarLebre(pergunta) : RESTAURANTES;
  const lista = base.filter((r) => `${r.nome} ${r.tipo} ${r.bairro}`.toLowerCase().includes(busca.trim().toLowerCase())).filter(
    (r) =>
      filtro === "Todos" ||
      (filtro === "Hoje à noite" && r.turnos.some(([, b]) => b >= "21:00")) ||
      (filtro === "Com garantia" && r.garantiaPorPessoa > 0) ||
      (filtro === "Sem garantia" && r.garantiaPorPessoa === 0) ||
      (filtro === "Fundadores" && r.fundador),
  );
  // O destaque pago aparece primeiro, sempre marcado como patrocinado (fora da resposta da Lebre).
  const ordenada = pergunta ? lista : [...lista.filter((r) => r.destaque), ...lista.filter((r) => !r.destaque)];
  const cartao = (r: Restaurante) => (
    <CartaoRestaurante
      key={r.id}
      r={r}
      fav={favoritos.includes(r.id)}
      alternar={() => alternarFavorito(r.id)}
      dia={dia}
      pessoas={pessoas}
      alvo={alvo}
      destaque={!pergunta && !!r.destaque}
    />
  );
  return (
    <SafeAreaView style={st.tela} edges={["top"]}>
      <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <T tom="pequeno" cor={C.muted}>
              Olá, {nome} · Fortaleza
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel={`Seus pontos: ${fmtPontos(pontos)}`} onPress={() => router.navigate("/perfil")} style={s.pontos}>
              <Ionicons name="sparkles" size={14} color={C.teal} />
              <T tom="rotulo" cor="#fff">
                {fmtPontos(pontos)}
              </T>
            </Pressable>
          </View>
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
        <View style={s.lebre}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
            <Image source={require("../../../assets/lebre.webp")} style={{ width: 48, height: 48 }} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <T tom="h3">Pergunte à Lebre</T>
              <T tom="pequeno" cor={C.muted}>
                Diga o que quer e ela acha a mesa.
              </T>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
            {SUGESTOES_LEBRE.map((q) => (
              <Pressable
                key={q}
                accessibilityRole="button"
                accessibilityState={{ selected: pergunta === q }}
                onPress={() => {
                  toque();
                  setPergunta((p) => (p === q ? null : q));
                }}
                style={[s.sugestao, pergunta === q && { backgroundColor: C.navy, borderColor: C.navy }]}
              >
                <T tom="rotulo" cor={pergunta === q ? "#fff" : C.navy}>
                  {q}
                </T>
              </Pressable>
            ))}
          </ScrollView>
          {pergunta && (
            <T tom="pequeno" cor={C.tealDark}>
              {lista.length
                ? `A Lebre achou ${lista.length} ${lista.length === 1 ? "lugar" : "lugares"} para "${pergunta}".`
                : `A Lebre não achou nada para "${pergunta}". Tente outra frase.`}
            </T>
          )}
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
        <View style={s.segmento}>
          {(["lista", "mapa"] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: modo === m }}
              onPress={() => {
                toque();
                setModo(m);
              }}
              style={[s.segItem, modo === m && { backgroundColor: C.bg, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4 }]}
            >
              <Ionicons name={m === "lista" ? "list" : "map-outline"} size={16} color={C.navy} />
              <T tom="rotulo" cor={C.navy}>
                {m === "lista" ? "Lista" : "Mapa"}
              </T>
            </Pressable>
          ))}
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

        {modo === "mapa" ? (
          <View style={{ gap: S.md }}>
            <View style={{ height: 360, borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.line }}>
              <Mapa lista={ordenada} selecionado={sel} onSelect={setSel} />
            </View>
            {ordenada.filter((r) => r.id === sel).map(cartao)}
          </View>
        ) : (
          ordenada.map(cartao)
        )}
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

function CartaoRestaurante({
  r,
  fav,
  alternar,
  dia,
  pessoas,
  alvo,
  destaque,
}: {
  r: Restaurante;
  fav: boolean;
  alternar: () => void;
  dia: string;
  pessoas: number;
  alvo: string;
  destaque: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${destaque ? "Patrocinado. " : ""}${r.nome}, ${r.tipo}, ${r.bairro}, nota ${r.nota}`}
      onPress={() => router.push({ pathname: "/restaurante/[id]", params: { id: r.id } })}
      style={({ pressed }) => [s.card, destaque && s.cardDestaque, pressed && { opacity: 0.92 }]}
    >
      {destaque && (
        <View style={s.faixaLebre}>
          <Image source={require("../../../assets/lebre.webp")} style={{ width: 28, height: 28 }} contentFit="contain" />
          <T tom="h3" cor={C.navy} style={{ flex: 1 }}>
            A Lebre recomenda
          </T>
          <View style={s.patrocinado}>
            <T tom="rotulo" cor={C.muted} style={{ fontSize: 11 }}>
              Patrocinado
            </T>
          </View>
        </View>
      )}
      <View>
        <Image source={r.foto} style={s.foto} contentFit="cover" transition={200} />
        <View style={s.sobreFoto}>
          {r.fundador && <Selo>Fundador</Selo>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fav ? `Tirar ${r.nome} dos favoritos` : `Salvar ${r.nome} nos favoritos`}
            onPress={() => {
              toque();
              alternar();
            }}
            hitSlop={8}
            style={[s.coracao, { marginLeft: "auto" }]}
          >
            <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? "#E5484D" : C.navy} />
          </Pressable>
        </View>
      </View>
      <View style={{ padding: S.lg, gap: 6 }}>
        {destaque && r.destaque && (
          <T tom="corpo" cor={C.tealDark} style={{ fontFamily: F.medium }}>
            “{r.destaque.motivo}”
          </T>
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T tom="h2">{r.nome}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="star" size={14} color={C.star} />
            <T tom="h3">{r.nota}</T>
            <T tom="pequeno" cor={C.muted}>
              ({r.avaliacoes})
            </T>
          </View>
        </View>
        <T tom="pequeno" cor={C.muted}>
          {r.tipo} · {r.bairro} · {r.preco}
        </T>
        <T tom="pequeno" cor={C.muted}>
          {r.clima.join(" · ")}
        </T>
        <Cartao_Horarios r={r} dia={dia} pessoas={pessoas} alvo={alvo} />
        <T tom="pequeno" cor={C.muted} style={{ marginTop: 2 }}>
          {r.garantiaPorPessoa > 0 ? `Garantia de ${brl(r.garantiaPorPessoa)} por pessoa, vira crédito na conta` : "Reserva sem garantia"}
        </T>
      </View>
    </Pressable>
  );
}

function Cartao_Horarios({ r, dia, pessoas, alvo }: { r: (typeof RESTAURANTES)[number]; dia: string; pessoas: number; alvo: string }) {
  const { slots, livresNoDia } = horariosCartao(r, dia, pessoas, alvo);
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      {livresNoDia > 0 && livresNoDia <= 6 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="alarm-outline" size={14} color={C.warn} />
          <T tom="pequeno" cor={C.warn}>
            Restam {livresNoDia} horários para amanhã
          </T>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="trending-up" size={14} color={C.tealDark} />
        <T tom="pequeno" cor={C.tealDark}>
          Reservado {RESERVADO_HOJE[r.id] ?? 0} vezes hoje
        </T>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
        {slots.map(({ d, livre }) =>
          livre ? (
            <Pressable
              key={d.toISOString()}
              accessibilityRole="button"
              accessibilityLabel={`Reservar ${r.nome} às ${localTime(d)}`}
              onPress={() => {
                toque();
                router.push({ pathname: "/reservar", params: { id: r.id, inicio: d.toISOString(), pessoas: String(pessoas) } });
              }}
              style={({ pressed }) => [s.horario, pressed && { backgroundColor: C.tealDark }]}
            >
              <T tom="rotulo" cor="#fff" style={{ fontSize: 13 }}>
                {localTime(d)}
              </T>
              {horarioCalmo(d) && (
                <T tom="rotulo" cor={C.teal} style={{ fontSize: 10, lineHeight: 12 }}>
                  +{BONUS_HORARIO_CALMO} pts
                </T>
              )}
            </Pressable>
          ) : (
            <View key={d.toISOString()} accessibilityLabel={`${localTime(d)} lotado`} style={[s.horario, { backgroundColor: C.bgSoft }]}>
              <T tom="rotulo" cor={C.muted} style={{ fontSize: 13, textDecorationLine: "line-through", opacity: 0.6 }}>
                {localTime(d)}
              </T>
            </View>
          ),
        )}
      </View>
      {!slots.some((x) => x.livre) && (
        <T tom="pequeno" cor={C.muted}>
          Lotado perto desse horário. Toque no restaurante para a lista de espera.
        </T>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pontos: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.navy, borderRadius: R.pill, paddingHorizontal: 12, minHeight: 36 },
  lebre: { gap: S.md, padding: S.md, borderRadius: R.lg, backgroundColor: C.tealSoft },
  sugestao: { minHeight: 36, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: "rgba(2,30,52,0.15)", backgroundColor: C.bg, justifyContent: "center" },
  segmento: { flexDirection: "row", backgroundColor: C.bgSoft, borderRadius: R.pill, padding: 4, alignSelf: "flex-start" },
  segItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, minHeight: 36, borderRadius: R.pill },
  cardDestaque: { borderColor: C.teal, borderWidth: 2 },
  faixaLebre: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.lg, paddingVertical: 10, backgroundColor: C.tealSoft },
  patrocinado: { borderWidth: 1, borderColor: C.line, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: C.bg },
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
  horario: { flex: 1, minHeight: 44, borderRadius: R.sm, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  sobreFoto: { position: "absolute", top: S.md, left: S.md, right: S.md, flexDirection: "row", justifyContent: "space-between" },
  coracao: { backgroundColor: "#fff", borderRadius: R.pill, padding: 6 },
});
