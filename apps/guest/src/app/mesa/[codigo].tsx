import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { applyGuaranteeCredit } from "@core/garantia";
import { C, F, R, S } from "@/constants/theme";
import { Aviso, Botao, Cartao, Linha, T, st, toque } from "@/components/ui";
import { brl, METODOS, restaurante, SERVICO, type Metodo } from "@/lib/demo";
import { useGuest } from "@/lib/store";

type Etapa = "conta" | "gorjeta" | "avaliar" | "fim";
const GORJETAS = [3, 5, 8] as const;

export default function Mesa() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const g = useGuest();
  const res = g.reservas.find((x) => x.codigo === codigo);
  const [aba, setAba] = useState<"conta" | "guest">(res && res.garantia > 0 ? "guest" : "conta");
  const [etapa, setEtapa] = useState<Etapa>("conta");
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [gorjeta, setGorjeta] = useState<number | null>(null);
  const [outro, setOutro] = useState("");
  const [nota, setNota] = useState(0);
  const [consente, setConsente] = useState(false);
  if (!res) return null;
  const r = restaurante(res.restauranteId);
  const qtd = Math.max(1, Math.ceil(res.pessoas / 2));
  const consumo = r.cardapio.reduce((s, i) => s + i.preco * qtd, 0);
  const servico = Math.round(consumo * SERVICO);
  const total = consumo + servico;
  const garantia = applyGuaranteeCredit(total, res.garantia);
  // Crédito de pontos entra depois da garantia e nunca vira devolução.
  const pontosUsados = Math.min(g.creditoPontos, garantia.toPay);
  const credito = { ...garantia, used: garantia.used + pontosUsados, toPay: garantia.toPay - pontosUsados };
  const outroCent = Math.round(Number(outro.replace(",", ".")) * 100) || 0;
  const valorGorjeta = gorjeta === -1 ? outroCent : gorjeta ? Math.round((total * gorjeta) / 100) : 0;
  const outroValido = gorjeta !== -1 || (outroCent >= 200 && outroCent <= total);

  return (
    <>
      <Stack.Screen options={{ title: `Mesa ${res.mesa}` }} />
      <ScrollView style={st.tela} contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
        <T tom="pequeno" cor={C.muted}>
          {r.nome} · atendida por {r.garcom}
        </T>

        {etapa === "conta" && (
          <>
            {res.garantia > 0 && (
              <View style={s.abas} accessibilityRole="tablist">
                {(
                  [
                    ["conta", "Conta da mesa"],
                    ["guest", "Tipe Guest"],
                  ] as const
                ).map(([k, l]) => (
                  <Pressable
                    key={k}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: aba === k }}
                    onPress={() => {
                      toque();
                      setAba(k);
                    }}
                    style={[s.aba, aba === k && { backgroundColor: C.navy }]}
                  >
                    <T tom="h3" cor={aba === k ? "#fff" : C.muted}>
                      {l}
                    </T>
                  </Pressable>
                ))}
              </View>
            )}

            {aba === "guest" && res.garantia > 0 ? (
              <>
                <Cartao style={{ backgroundColor: C.tealSoft, borderWidth: 0, gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={28} color={C.tealDark} />
                  <T tom="h2">Reserva reconhecida</T>
                  <T tom="corpo">
                    {res.codigo} · {res.nome} · {res.pessoas} pessoas
                  </T>
                  <T tom="pequeno" cor={C.muted}>
                    A mesa {res.mesa} foi aberta pela sua reserva, então o desconto entrou sozinho.
                  </T>
                </Cartao>
                <Cartao>
                  <Linha a="Garantia paga" b={brl(res.garantia)} />
                  <Linha a="Desconto nesta conta" b={`−${brl(garantia.used)}`} cor={C.tealDark} />
                  {pontosUsados > 0 && <Linha a="Crédito dos seus pontos" b={`−${brl(pontosUsados)}`} cor={C.tealDark} />}
                  {credito.refund > 0 && <Linha a="Devolvido a você" b={brl(credito.refund)} />}
                </Cartao>
                <Aviso>Chegou sem passar pela recepção? Mostre o código {res.codigo} ao garçom e o desconto entra na conta.</Aviso>
                <Botao tipo="escuro" onPress={() => setAba("conta")}>
                  Ver a conta com desconto
                </Botao>
              </>
            ) : (
              <>
                <Cartao>
                  {r.cardapio.map((i) => (
                    <Linha key={i.nome} a={`${qtd}× ${i.nome}`} b={brl(i.preco * qtd)} />
                  ))}
                  <Linha a="Serviço (10%)" b={brl(servico)} cor={C.muted} />
                  {credito.used > 0 && <Linha a="Desconto Tipe Guest" b={`−${brl(credito.used)}`} cor={C.tealDark} />}
                  <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 4 }}>
                    <Linha a={credito.used > 0 ? "A pagar" : "Total"} b={brl(credito.toPay)} destaque />
                  </View>
                </Cartao>
                <View style={{ gap: S.sm }} accessibilityRole="radiogroup" accessibilityLabel="Forma de pagamento">
                  {METODOS.map((m) => (
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
                <Botao
                  desativado={!metodo}
                  onPress={() => {
                    g.atualizarReserva(res.codigo, { pago: credito.toPay });
                    if (pontosUsados) g.usarCredito(pontosUsados);
                    setEtapa("gorjeta");
                  }}
                >
                  {metodo === "estabelecimento" ? "Avisar o garçom" : `Pagar ${brl(credito.toPay)}`}
                </Botao>
              </>
            )}
          </>
        )}

        {etapa === "gorjeta" && (
          <>
            <Cartao style={{ backgroundColor: C.tealSoft, borderWidth: 0 }}>
              <T tom="h2">Conta paga</T>
              <T tom="pequeno" cor={C.muted}>
                Quer agradecer a {r.garcom}? A gorjeta extra é opcional e vai num segundo pagamento.
              </T>
            </Cartao>
            <View style={{ flexDirection: "row", gap: S.sm }}>
              {GORJETAS.map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: gorjeta === p }}
                  onPress={() => {
                    toque();
                    setGorjeta(p);
                  }}
                  style={[s.gorjeta, gorjeta === p && { backgroundColor: C.navy, borderColor: C.navy }]}
                >
                  <T tom="h2" cor={gorjeta === p ? "#fff" : C.navy}>
                    {p}%
                  </T>
                  <T tom="pequeno" cor={gorjeta === p ? "#ffffffb3" : C.muted}>
                    {brl(Math.round((total * p) / 100))}
                  </T>
                  {p === 5 && (
                    <T tom="rotulo" cor={gorjeta === p ? C.teal : C.tealDark}>
                      Sugerida
                    </T>
                  )}
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: gorjeta === -1 }}
              onPress={() => setGorjeta(-1)}
              style={[s.metodo, gorjeta === -1 && { borderColor: C.navy }]}
            >
              <T tom="h3" style={{ flex: 1 }}>
                Outro valor
              </T>
              {gorjeta === -1 && (
                <TextInput
                  autoFocus
                  value={outro}
                  onChangeText={setOutro}
                  keyboardType="decimal-pad"
                  placeholder="R$ 2,00"
                  accessibilityLabel="Valor da gorjeta"
                  style={{ fontFamily: F.semibold, fontSize: 16, minWidth: 90, textAlign: "right", color: C.text }}
                />
              )}
            </Pressable>
            {gorjeta === -1 && !outroValido && (
              <T tom="pequeno" cor={C.danger}>
                Escolha entre R$ 2,00 e {brl(total)}.
              </T>
            )}
            <Botao
              desativado={!gorjeta || !outroValido}
              onPress={() => {
                g.atualizarReserva(res.codigo, { gorjeta: valorGorjeta });
                setEtapa("avaliar");
              }}
            >
              {gorjeta ? `Enviar ${brl(valorGorjeta)} para ${r.garcom}` : "Escolha um valor"}
            </Botao>
            <Botao tipo="fantasma" onPress={() => setEtapa("avaliar")}>
              Agora não
            </Botao>
            <T tom="pequeno" cor={C.muted} style={{ textAlign: "center" }}>
              70% vai para {r.garcom} e 30% para a equipe Tipe.
            </T>
          </>
        )}

        {etapa === "avaliar" && (
          <>
            <T tom="h1">Como foi?</T>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: S.sm }} accessibilityRole="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityLabel={`${n} estrelas`}
                  accessibilityState={{ checked: nota === n }}
                  onPress={() => {
                    toque();
                    setNota(n);
                  }}
                  hitSlop={6}
                >
                  <Ionicons name={n <= nota ? "star" : "star-outline"} size={40} color={n <= nota ? C.star : C.line} />
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consente }}
              onPress={() => setConsente((c) => !c)}
              style={{ flexDirection: "row", gap: 10 }}
            >
              <Ionicons name={consente ? "checkbox" : "square-outline"} size={22} color={consente ? C.tealDark : C.muted} />
              <T tom="pequeno" style={{ flex: 1 }}>
                Autorizo mostrar minha nota (sem meu nome completo) para quem procura este restaurante. Sem autorização, ela fica
                só com o restaurante.
              </T>
            </Pressable>
            <Botao
              tipo="escuro"
              desativado={!nota}
              onPress={() => {
                g.atualizarReserva(res.codigo, { nota, status: "concluida" });
                setEtapa("fim");
              }}
            >
              Enviar avaliação
            </Botao>
          </>
        )}

        {etapa === "fim" && (
          <View style={{ alignItems: "center", gap: S.md, paddingVertical: S.xl }}>
            <Ionicons name="heart-circle" size={64} color={C.teal} />
            <T tom="h1">Até a próxima!</T>
            <T tom="corpo" cor={C.muted} style={{ textAlign: "center" }}>
              Conta paga e avaliação registrada. {r.nome} fica nos seus favoritos para a próxima.
            </T>
            <Botao
              tipo="escuro"
              style={{ alignSelf: "stretch" }}
              onPress={() => {
                if (!g.favoritos.includes(r.id)) g.alternarFavorito(r.id);
                router.dismissTo("/");
              }}
            >
              Voltar ao início
            </Botao>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  abas: { flexDirection: "row", backgroundColor: C.bgSoft, borderRadius: R.pill, padding: 4 },
  aba: { flex: 1, minHeight: 44, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
  metodo: { minHeight: 56, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: S.lg, flexDirection: "row", alignItems: "center", gap: S.md },
  gorjeta: { flex: 1, minHeight: 92, borderRadius: R.md, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", gap: 2 },
});
