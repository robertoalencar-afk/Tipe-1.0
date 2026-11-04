import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, F, R, S } from "@/constants/theme";
import { Aviso, T, st } from "@/components/ui";
import { restaurante } from "@/lib/demo";
import { useGuest } from "@/lib/store";
import { brl } from "@/lib/demo";
import { CREDITO_RESGATE, fmtPontos, PONTOS_POR_RESGATE } from "@/lib/pontos";
import { Botao } from "@/components/ui";

function Item({ icone, titulo, sub, onPress }: { icone: ComponentProps<typeof Ionicons>["name"]; titulo: string; sub?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line }}
    >
      <Ionicons name={icone} size={22} color={C.navy} />
      <View style={{ flex: 1 }}>
        <T tom="h3">{titulo}</T>
        {sub && (
          <T tom="pequeno" cor={C.muted}>
            {sub}
          </T>
        )}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={C.muted} />}
    </Pressable>
  );
}

export default function Perfil() {
  const { nome, setNome, favoritos, reservas, pontos, extrato, resgatar, creditoPontos } = useGuest();
  const visitas = reservas.filter((r) => r.status === "sentada" || r.status === "concluida").length;
  return (
    <SafeAreaView style={st.tela} edges={["top"]}>
      <ScrollView contentContainerStyle={st.conteudo}>
        <T tom="titulo">Perfil</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" }}>
            <T tom="h1" cor={C.teal}>
              {(nome[0] ?? "?").toUpperCase()}
            </T>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T tom="rotulo" cor={C.muted}>
              NOME NA RESERVA
            </T>
            <TextInput
              value={nome}
              onChangeText={setNome}
              accessibilityLabel="Nome na reserva"
              style={{ fontFamily: F.semibold, fontSize: 18, color: C.navy, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6 }}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: S.sm }}>
          {[
            [String(reservas.length), "reservas"],
            [String(visitas), "visitas"],
            [String(favoritos.length), "favoritos"],
          ].map(([n, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: C.bgSoft, borderRadius: R.md, padding: S.md, gap: 2 }}>
              <T tom="h1">{n}</T>
              <T tom="pequeno" cor={C.muted}>
                {l}
              </T>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: C.navy, borderRadius: R.lg, padding: S.lg, gap: S.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T tom="rotulo" cor={C.teal}>
              TIPE PONTOS
            </T>
            <Ionicons name="sparkles" size={18} color={C.teal} />
          </View>
          <T tom="titulo" cor="#fff">
            {fmtPontos(pontos)}
          </T>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, (pontos / PONTOS_POR_RESGATE) * 100)}%`, height: 8, backgroundColor: C.teal }} />
          </View>
          <T tom="pequeno" cor="rgba(255,255,255,0.75)">
            {pontos >= PONTOS_POR_RESGATE
              ? `Você já pode trocar ${fmtPontos(PONTOS_POR_RESGATE)} por ${brl(CREDITO_RESGATE)} de crédito.`
              : `Faltam ${fmtPontos(PONTOS_POR_RESGATE - pontos)} para ${brl(CREDITO_RESGATE)} de crédito na conta.`}
          </T>
          {pontos >= PONTOS_POR_RESGATE && (
            <Botao onPress={() => resgatar()} icone="gift-outline">
              Trocar por {brl(CREDITO_RESGATE)}
            </Botao>
          )}
          {creditoPontos > 0 && (
            <T tom="h3" cor={C.teal}>
              {brl(creditoPontos)} de crédito: entra sozinho na próxima conta Tipe.
            </T>
          )}
          <T tom="pequeno" cor="rgba(255,255,255,0.6)">
            Ganhe 100 pts por reserva honrada e +300 em horário calmo.
          </T>
        </View>
        <View>
          <T tom="rotulo" cor={C.muted}>
            EXTRATO DE PONTOS
          </T>
          {extrato.slice(0, 5).map((e, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <T tom="corpo" style={{ flex: 1 }}>
                {e.t}
              </T>
              <T tom="h3" cor={e.pts > 0 ? C.tealDark : C.muted}>
                {e.pts > 0 ? "+" : ""}
                {fmtPontos(e.pts)}
              </T>
            </View>
          ))}
        </View>
        <View>
          <T tom="rotulo" cor={C.muted}>
            FAVORITOS
          </T>
          {favoritos.length ? (
            favoritos.map((id) => (
              <Item key={id} icone="heart" titulo={restaurante(id).nome} sub={restaurante(id).bairro} onPress={() => router.push({ pathname: "/restaurante/[id]", params: { id } })} />
            ))
          ) : (
            <Item icone="heart-outline" titulo="Nenhum favorito" sub="Toque no coração de um restaurante para guardar aqui." />
          )}
        </View>
        <View>
          <T tom="rotulo" cor={C.muted}>
            CONTA
          </T>
          <Item icone="card-outline" titulo="Pagamentos" sub="Pix, Apple Pay e Google Pay. Nenhum cartão é guardado no app." />
          <Item icone="notifications-outline" titulo="Avisos" sub="Lembrete da reserva e chamada da fila." />
          <Item icone="shield-checkmark-outline" titulo="Privacidade" sub="Localização só na porta, para a fila. Seus dados ficam com o Tipe e o restaurante da reserva." />
        </View>
        <Aviso icone="flask-outline">Versão de demonstração. Nada é enviado e nenhuma cobrança acontece.</Aviso>
      </ScrollView>
    </SafeAreaView>
  );
}
