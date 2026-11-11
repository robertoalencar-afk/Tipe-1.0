import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native";
import { guaranteeOutcome } from "@core/garantia";
import { localTime, RESERVATION_STATUS_LABEL } from "@core/reservas";
import { C, S } from "@/constants/theme";
import { Aviso, Botao, Cartao, Linha, Selo, T, st } from "@/components/ui";
import { brl, restaurante, SETTINGS } from "@/lib/demo";
import { useGuest } from "@/lib/store";
import { fmtPontos, pontosDaReserva } from "@/lib/pontos";

export default function Reserva() {
  const { codigo, nova } = useLocalSearchParams<{ codigo: string; nova?: string }>();
  const g = useGuest();
  const res = g.reservas.find((x) => x.codigo === codigo);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  if (!res)
    return (
      <View style={[st.tela, st.conteudo]}>
        <T tom="h2">Reserva não encontrada</T>
        <Botao tipo="contorno" onPress={() => router.replace("/reservas")}>
          Ver minhas reservas
        </Botao>
      </View>
    );
  const r = restaurante(res.restauranteId);
  const inicio = new Date(res.inicio);
  const fim = guaranteeOutcome({ event: "cancelada_cliente", start: inicio, at: new Date(), refundCutoffMin: SETTINGS.cancelCutoffMin });
  const ativa = res.status === "confirmada";

  return (
    <ScrollView style={st.tela} contentContainerStyle={st.conteudo}>
      {nova && ativa && (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: S.md }}>
          <Ionicons name="checkmark-circle" size={56} color={C.teal} />
          <T tom="h1">Reserva confirmada</T>
          <T tom="pequeno" cor={C.muted}>
            Enviamos os detalhes para o seu app.
          </T>
        </View>
      )}
      <Cartao>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T tom="h2">{r.nome}</T>
          <Selo
            cor={res.status === "nao_compareceu" || res.status.startsWith("cancelada") ? C.warn : C.tealDark}
            fundo={res.status === "nao_compareceu" || res.status.startsWith("cancelada") ? "#FEF0C7" : C.tealSoft}
          >
            {RESERVATION_STATUS_LABEL[res.status]}
          </Selo>
        </View>
        <T tom="titulo" style={{ marginTop: S.sm }}>
          {inicio.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Fortaleza" })}
        </T>
        <T tom="h2" cor={C.tealDark}>
          {localTime(inicio)} · {res.pessoas} {res.pessoas === 1 ? "pessoa" : "pessoas"}
        </T>
        <View style={{ marginTop: S.md, borderTopWidth: 1, borderTopColor: C.line }}>
          <Linha a="Em nome de" b={res.nome} />
          {res.ocasiao !== "Sem ocasião" && <Linha a="Ocasião" b={res.ocasiao} />}
          <Linha a="Endereço" b={`${r.bairro}, Fortaleza`} />
          <Linha a="Código" b={res.codigo} />
          <Linha a="Pontos ao chegar" b={`+${fmtPontos(pontosDaReserva(new Date(res.inicio)))}`} cor={C.tealDark} />
          {res.garantia > 0 && (
            <Linha
              a="Garantia"
              b={
                res.garantiaFim === "devolvida"
                  ? `${brl(res.garantia)} devolvida`
                  : res.garantiaFim === "retida"
                    ? `${brl(res.garantia)} não devolvida`
                    : res.garantiaFim === "credito"
                      ? `${brl(res.garantia)} na conta`
                      : `${brl(res.garantia)} paga${res.garantiaMetodo ? ` (${res.garantiaMetodo})` : ""}`
              }
              cor={res.garantiaFim === "retida" ? C.warn : C.text}
            />
          )}
        </View>
      </Cartao>

      {ativa && res.garantia > 0 && (
        <Aviso icone="wallet-outline">
          No dia, a garantia vira desconto na conta da mesa. Quando a recepção te levar à mesa, a conta reconhece a reserva
          sozinha.
        </Aviso>
      )}
      {res.status === "nao_compareceu" && (
        <Aviso icone="alert-circle-outline">O restaurante marcou ausência. Pelas regras aceitas, a garantia não é devolvida.</Aviso>
      )}

      {ativa && (
        <View style={{ gap: S.sm }}>
          <T tom="rotulo" cor={C.muted}>
            DEMONSTRAÇÃO: FAÇA O PAPEL DA RECEPÇÃO
          </T>
          <Botao
            tipo="escuro"
            icone="restaurant-outline"
            onPress={() => {
              g.atualizarReserva(res.codigo, { status: "sentada", ...(res.garantia > 0 ? { garantiaFim: "credito" as const } : {}) });
              g.ganharPontos(`${r.nome} · reserva honrada`, pontosDaReserva(new Date(res.inicio)));
              router.push({ pathname: "/mesa/[codigo]", params: { codigo: res.codigo } });
            }}
          >
            Cheguei: levar à mesa {res.mesa}
          </Botao>
          {res.garantia > 0 && (
            <Botao tipo="fantasma" onPress={() => g.atualizarReserva(res.codigo, { status: "nao_compareceu", garantiaFim: "retida" })}>
              Simular ausência
            </Botao>
          )}
        </View>
      )}
      {(res.status === "sentada" || res.status === "chegou") && (
        <Botao tipo="escuro" icone="receipt-outline" onPress={() => router.push({ pathname: "/mesa/[codigo]", params: { codigo: res.codigo } })}>
          Abrir a conta da mesa {res.mesa}
        </Botao>
      )}

      {ativa &&
        (confirmarCancelar ? (
          <Cartao>
            <T tom="h3">Cancelar esta reserva?</T>
            <T tom="pequeno" cor={C.muted} style={{ marginTop: 4 }}>
              {res.garantia === 0
                ? "A mesa volta a ficar livre para outras pessoas."
                : fim === "devolvida"
                  ? `Você está no prazo: devolvemos ${brl(res.garantia)}.`
                  : `Fora do prazo: a garantia de ${brl(res.garantia)} não é devolvida.`}
            </T>
            <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.md }}>
              <Botao tipo="contorno" style={{ flex: 1 }} onPress={() => setConfirmarCancelar(false)}>
                Manter
              </Botao>
              <Botao
                tipo="perigo"
                style={{ flex: 1 }}
                onPress={() => {
                  g.atualizarReserva(res.codigo, {
                    status: "cancelada_cliente",
                    ...(res.garantia > 0 ? { garantiaFim: fim === "devolvida" ? ("devolvida" as const) : ("retida" as const) } : {}),
                  });
                  setConfirmarCancelar(false);
                }}
              >
                Cancelar
              </Botao>
            </View>
          </Cartao>
        ) : (
          <Botao tipo="contorno" onPress={() => setConfirmarCancelar(true)}>
            Cancelar reserva
          </Botao>
        ))}
    </ScrollView>
  );
}
