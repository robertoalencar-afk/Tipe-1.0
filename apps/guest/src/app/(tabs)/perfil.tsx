import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, F, R, S } from "@/constants/theme";
import { Aviso, T, st } from "@/components/ui";
import { restaurante } from "@/lib/demo";
import { useGuest } from "@/lib/store";

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
  const { nome, setNome, favoritos, reservas } = useGuest();
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
