import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { addDays, availableSlots, localDay, localInstant, localTime } from "@core/reservas";
import { C, R, S } from "@/constants/theme";
import { Aviso, Botao, Cartao, Chip, Selo, T, st, toque } from "@/components/ui";
import { brl, hhmm, ocupacoes, regras, restaurante, SETTINGS } from "@/lib/demo";
import { useGuest } from "@/lib/store";

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default function Restaurante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = restaurante(String(id));
  const { favoritos, alternarFavorito } = useGuest();
  const hoje = localDay(new Date());
  const [dia, setDia] = useState(addDays(hoje, 1));
  const [pessoas, setPessoas] = useState(2);
  const [escolhido, setEscolhido] = useState<Date | null>(null);
  const now = useMemo(() => new Date(), [dia]); // eslint-disable-line react-hooks/exhaustive-deps
  const occ = useMemo(() => ocupacoes(r, hoje), [r, hoje]);
  const livres = availableSlots({
    settings: SETTINGS,
    rules: regras(r),
    exceptions: [],
    tables: r.mesas,
    combinations: [],
    now,
    occupations: occ,
    day: dia,
    party: pessoas,
  });
  const grade = r.turnos
    .flatMap(([a, b]) => {
      const out: Date[] = [];
      for (let m = hhmm(a); m <= hhmm(b); m += SETTINGS.slotIntervalMin)
        out.push(localInstant(dia, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`));
      return out;
    })
    .filter((d) => d.getTime() >= now.getTime() + SETTINGS.minAdvanceMin * 60_000);
  const livre = (d: Date) => livres.some((x) => x.getTime() === d.getTime());
  const fav = favoritos.includes(r.id);

  return (
    <View style={st.tela}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Image source={r.foto} style={s.hero} contentFit="cover" />
        <View style={[st.conteudo, { marginTop: -28, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: S.md }}>
            <View style={{ flex: 1, gap: 6 }}>
              {r.fundador && <Selo>Restaurante Fundador</Selo>}
              <T tom="h1">{r.nome}</T>
              <T tom="pequeno" cor={C.muted}>
                {r.tipo} · {r.bairro} · {r.preco}
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fav ? "Remover dos favoritos" : "Salvar nos favoritos"}
              onPress={() => {
                toque();
                alternarFavorito(r.id);
              }}
              style={s.fav}
            >
              <Ionicons name={fav ? "heart" : "heart-outline"} size={22} color={fav ? "#E5484D" : C.navy} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: S.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="star" size={15} color={C.star} />
              <T tom="h3">{r.nota}</T>
              <T tom="pequeno" cor={C.muted}>
                ({r.avaliacoes})
              </T>
            </View>
            <T tom="pequeno" cor={C.muted}>
              Atendimento: {r.garcom} e equipe
            </T>
          </View>
          <T tom="corpo">{r.descricao}</T>

          <View style={{ gap: S.sm }}>
            <T tom="h3">Quando?</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
              {Array.from({ length: 7 }, (_, i) => addDays(hoje, i)).map((d) => {
                const dt = new Date(`${d}T12:00:00Z`);
                const rotulo = d === hoje ? "Hoje" : d === addDays(hoje, 1) ? "Amanhã" : SEMANA[dt.getUTCDay()]!;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityState={{ selected: dia === d }}
                    accessibilityLabel={`${rotulo}, dia ${dt.getUTCDate()}`}
                    onPress={() => {
                      toque();
                      setDia(d);
                      setEscolhido(null);
                    }}
                    style={[s.dia, dia === d && { backgroundColor: C.navy, borderColor: C.navy }]}
                  >
                    <T tom="rotulo" cor={dia === d ? "#ffffffcc" : C.muted}>
                      {rotulo}
                    </T>
                    <T tom="h2" cor={dia === d ? "#fff" : C.navy}>
                      {dt.getUTCDate()}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <T tom="h3">Quantas pessoas?</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Menos uma pessoa"
                disabled={pessoas <= SETTINGS.minParty}
                onPress={() => {
                  toque();
                  setPessoas((p) => Math.max(SETTINGS.minParty, p - 1));
                  setEscolhido(null);
                }}
                style={s.passo}
              >
                <Ionicons name="remove" size={20} color={C.navy} />
              </Pressable>
              <T tom="h2" style={{ minWidth: 28, textAlign: "center" }}>
                {pessoas}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mais uma pessoa"
                disabled={pessoas >= SETTINGS.maxParty}
                onPress={() => {
                  toque();
                  setPessoas((p) => Math.min(SETTINGS.maxParty, p + 1));
                  setEscolhido(null);
                }}
                style={s.passo}
              >
                <Ionicons name="add" size={20} color={C.navy} />
              </Pressable>
            </View>
          </View>

          <View style={{ gap: S.sm }}>
            <T tom="h3">Horários</T>
            {grade.length === 0 ? (
              <Aviso>Sem horários neste dia. Escolha outro dia.</Aviso>
            ) : (
              <View style={s.grade}>
                {grade.map((d) => (
                  <Chip
                    key={d.toISOString()}
                    ativo={escolhido?.getTime() === d.getTime()}
                    riscado={!livre(d)}
                    rotuloA11y={livre(d) ? `Reservar às ${localTime(d)}` : `${localTime(d)} lotado`}
                    onPress={() => setEscolhido(d)}
                  >
                    {localTime(d)}
                  </Chip>
                ))}
              </View>
            )}
            <T tom="pequeno" cor={C.muted}>
              Horário riscado está lotado: você pode entrar na lista de espera.
            </T>
          </View>

          <Cartao suave>
            <T tom="h3">Como funciona a reserva</T>
            <T tom="pequeno" cor={C.muted} style={{ marginTop: 4 }}>
              Mesa por até {SETTINGS.durationMin} minutos. Cancelamento pelo app até {SETTINGS.cancelCutoffMin / 60} horas antes.{" "}
              {r.garantiaPorPessoa > 0
                ? `Garantia de ${brl(r.garantiaPorPessoa)} por pessoa para confirmar, descontada da conta no dia.`
                : "Este restaurante não pede garantia."}
            </T>
          </Cartao>
        </View>
      </ScrollView>
      {escolhido && (
        <View style={s.rodape}>
          {livre(escolhido) ? (
            <Botao
              tipo="escuro"
              onPress={() =>
                router.push({ pathname: "/reservar", params: { id: r.id, inicio: escolhido.toISOString(), pessoas: String(pessoas) } })
              }
            >
              Reservar às {localTime(escolhido)}
            </Botao>
          ) : (
            <Botao
              tipo="contorno"
              icone="time-outline"
              onPress={() =>
                router.push({
                  pathname: "/reservar",
                  params: { id: r.id, inicio: escolhido.toISOString(), pessoas: String(pessoas), espera: "1" },
                })
              }
            >
              Entrar na lista de espera das {localTime(escolhido)}
            </Botao>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { width: "100%", height: 230, backgroundColor: C.bgSoft },
  fav: { width: 44, height: 44, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  dia: { width: 64, minHeight: 64, borderRadius: R.md, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", gap: 2 },
  passo: { width: 44, height: 44, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  rodape: { position: "absolute", left: 0, right: 0, bottom: 0, padding: S.lg, paddingBottom: 32, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line },
});
