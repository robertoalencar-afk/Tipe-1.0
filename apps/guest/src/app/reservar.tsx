import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { guaranteeAmountCents, guaranteePolicyLines } from "@core/garantia";
import { localTime, occupiedRange } from "@core/reservas";
import { C, F, R, S } from "@/constants/theme";
import { Aviso, Botao, Cartao, T, st, toque } from "@/components/ui";
import { brl, METODOS, OCASIOES, ocupacoes, restaurante, SETTINGS, type Metodo } from "@/lib/demo";
import { useGuest } from "@/lib/store";
import { localDay } from "@core/reservas";

const HOLD = 5 * 60;

export default function Reservar() {
  const p = useLocalSearchParams<{ id: string; inicio: string; pessoas: string; espera?: string }>();
  const r = restaurante(String(p.id));
  const inicio = new Date(String(p.inicio));
  const pessoas = Number(p.pessoas) || 2;
  const g = useGuest();
  const [etapa, setEtapa] = useState<"espera" | "dados" | "garantia">(p.espera ? "espera" : "dados");
  const [nome, setNome] = useState(g.nome);
  const [ocasiao, setOcasiao] = useState(OCASIOES[0]!);
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [aceite, setAceite] = useState(false);
  const [restante, setRestante] = useState(HOLD);
  const [pagando, setPagando] = useState(false);
  const garantia = guaranteeAmountCents({ perPersonCents: r.garantiaPorPessoa, refundCutoffMin: SETTINGS.cancelCutoffMin }, pessoas);

  useEffect(() => {
    if (etapa === "espera") return;
    const t = setInterval(() => setRestante((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [etapa]);
  useEffect(() => {
    if (restante === 0) router.back();
  }, [restante]);

  function confirmar() {
    const range = occupiedRange(inicio, SETTINGS);
    const occ = ocupacoes(r, localDay(new Date()));
    const mesa =
      r.mesas
        .filter((m) => pessoas >= (m.seatsMin ?? 1) && pessoas <= m.seatsMax)
        .filter((m) => !occ.some((o) => o.tableId === m.id && o.start < range.end && range.start < o.end))
        .sort((a, b) => a.seatsMax - b.seatsMax)[0]?.numero ?? r.mesas[r.mesas.length - 1]!.numero;
    const codigo = g.novoCodigo();
    g.setNome(nome.trim());
    g.salvarReserva({
      codigo,
      restauranteId: r.id,
      inicio: inicio.toISOString(),
      pessoas,
      mesa,
      nome: nome.trim(),
      ocasiao,
      status: "confirmada",
      garantia,
      ...(garantia > 0 && metodo ? { garantiaMetodo: METODOS.find((m) => m.id === metodo)!.nome } : {}),
    });
    router.dismissTo({ pathname: "/reserva/[codigo]", params: { codigo, nova: "1" } });
  }

  const relogio = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}`;
  return (
    <ScrollView style={st.tela} contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
      <View style={s.resumo}>
        <T tom="pequeno" cor="#ffffffb3">
          {r.nome} · {pessoas} {pessoas === 1 ? "pessoa" : "pessoas"}
        </T>
        <T tom="titulo" cor="#fff">
          {inicio.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Fortaleza" })},{" "}
          {localTime(inicio)}
        </T>
        {etapa !== "espera" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }} accessibilityLiveRegion="polite">
            <Ionicons name="time-outline" size={15} color={C.teal} />
            <T tom="pequeno" cor="#fff">
              Seguramos este horário por {relogio}
            </T>
          </View>
        )}
      </View>

      {etapa === "espera" && (
        <>
          <Cartao>
            <T tom="h2">Você está na lista de espera</T>
            <T tom="corpo" cor={C.muted} style={{ marginTop: 6 }}>
              Cerca de 2 grupos na sua frente (estimativa). Quando uma mesa liberar, avisamos aqui e você tem 15 minutos para
              confirmar.
            </T>
          </Cartao>
          <Aviso icone="flask-outline">Demonstração: toque abaixo para simular o aviso do restaurante.</Aviso>
          <Botao tipo="escuro" icone="notifications-outline" onPress={() => setEtapa("dados")}>
            Simular: uma mesa liberou
          </Botao>
        </>
      )}

      {etapa === "dados" && (
        <>
          <View style={{ gap: 6 }}>
            <T tom="rotulo" cor={C.muted} nativeID="rotulo-nome">
              Nome da reserva
            </T>
            <TextInput
              accessibilityLabelledBy="rotulo-nome"
              value={nome}
              onChangeText={setNome}
              maxLength={40}
              autoComplete="name"
              style={s.input}
            />
          </View>
          <View style={{ gap: 6 }}>
            <T tom="rotulo" cor={C.muted}>
              Ocasião
            </T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
              {OCASIOES.map((o) => (
                <Pressable
                  key={o}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ocasiao === o }}
                  onPress={() => {
                    toque();
                    setOcasiao(o);
                  }}
                  style={[s.tag, ocasiao === o && { backgroundColor: C.navy, borderColor: C.navy }]}
                >
                  <T tom="rotulo" cor={ocasiao === o ? "#fff" : C.navy}>
                    {o}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
          <Botao
            desativado={nome.trim().length < 2}
            onPress={() => (garantia > 0 ? setEtapa("garantia") : confirmar())}
          >
            {garantia > 0 ? "Continuar para a garantia" : "Confirmar reserva"}
          </Botao>
          <T tom="pequeno" cor={C.muted} style={{ textAlign: "center" }}>
            {garantia > 0 ? `Garantia de ${brl(garantia)}, descontada da conta no dia.` : "Reservar é grátis neste restaurante."}
          </T>
        </>
      )}

      {etapa === "garantia" && (
        <>
          <Cartao style={{ backgroundColor: C.tealSoft, borderWidth: 0 }}>
            <T tom="rotulo" cor={C.tealDark}>
              Garantia da reserva
            </T>
            <T tom="titulo">{brl(garantia)}</T>
            <T tom="pequeno" cor={C.muted}>
              {brl(r.garantiaPorPessoa)} por pessoa · vira desconto na conta da mesa
            </T>
          </Cartao>
          <View style={{ gap: 8 }}>
            {guaranteePolicyLines({ perPersonCents: r.garantiaPorPessoa, refundCutoffMin: SETTINGS.cancelCutoffMin }, pessoas)
              .slice(1)
              .map((l) => (
                <View key={l} style={{ flexDirection: "row", gap: 10 }}>
                  <View style={s.ponto} />
                  <T tom="pequeno" style={{ flex: 1 }}>
                    {l}
                  </T>
                </View>
              ))}
          </View>
          <View style={{ gap: S.sm }} accessibilityRole="radiogroup" accessibilityLabel="Forma de pagamento da garantia">
            {METODOS.filter((m) => m.id !== "estabelecimento").map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: metodo === m.id }}
                onPress={() => {
                  toque();
                  setMetodo(m.id);
                }}
                style={[s.metodo, metodo === m.id && { borderColor: C.navy, backgroundColor: C.navy }]}
              >
                <Ionicons name={m.icone} size={20} color={metodo === m.id ? "#fff" : C.navy} />
                <T tom="h3" cor={metodo === m.id ? "#fff" : C.navy} style={{ flex: 1 }}>
                  {m.nome}
                </T>
                <T tom="pequeno" cor={metodo === m.id ? "#ffffffb3" : C.muted}>
                  {m.desc}
                </T>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aceite }}
            onPress={() => {
              toque();
              setAceite((a) => !a);
            }}
            style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
          >
            <Ionicons name={aceite ? "checkbox" : "square-outline"} size={22} color={aceite ? C.tealDark : C.muted} />
            <T tom="pequeno" style={{ flex: 1 }}>
              Li e aceito as regras da garantia, inclusive que o valor não é devolvido se eu não comparecer.
            </T>
          </Pressable>
          <Botao
            desativado={!metodo || !aceite}
            carregando={pagando}
            onPress={() => {
              setPagando(true);
              setTimeout(confirmar, 700);
            }}
          >
            Pagar {brl(garantia)} e confirmar
          </Botao>
          <T tom="pequeno" cor={C.muted} style={{ textAlign: "center" }}>
            Demonstração: aprovado na simulação, nenhuma cobrança real.
          </T>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  resumo: { backgroundColor: C.navy, borderRadius: R.lg, padding: S.xl, gap: 2 },
  input: {
    minHeight: 50,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S.lg,
    fontFamily: F.regular,
    fontSize: 16,
    color: C.text,
  },
  tag: { minHeight: 36, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, justifyContent: "center" },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal, marginTop: 7 },
  metodo: {
    minHeight: 56,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
  },
});
