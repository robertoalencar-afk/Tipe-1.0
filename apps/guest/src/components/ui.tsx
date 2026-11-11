// Componentes base do app: tipografia Inter Tight, botões grandes (mínimo 48 pt) e cartões claros.
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { C, F, R, S } from "@/constants/theme";

type Tom = "titulo" | "h1" | "h2" | "h3" | "corpo" | "pequeno" | "rotulo";
const TOM: Record<Tom, TextStyle> = {
  titulo: { fontFamily: F.semibold, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  h1: { fontFamily: F.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.7 },
  h2: { fontFamily: F.semibold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4 },
  h3: { fontFamily: F.semibold, fontSize: 16, lineHeight: 21 },
  corpo: { fontFamily: F.regular, fontSize: 15, lineHeight: 21 },
  pequeno: { fontFamily: F.regular, fontSize: 13, lineHeight: 18 },
  rotulo: { fontFamily: F.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
};

export function T({
  tom = "corpo",
  cor = C.text,
  style,
  ...p
}: TextProps & { tom?: Tom; cor?: string }) {
  return <Text {...p} style={[TOM[tom], { color: cor }, style]} />;
}

export const toque = () => {
  if (Platform.OS !== "web") void Haptics.selectionAsync();
};

export function Botao({
  children,
  onPress,
  tipo = "primario",
  desativado,
  carregando,
  icone,
  style,
  rotuloA11y,
}: {
  children: ReactNode;
  onPress: () => void;
  tipo?: "primario" | "escuro" | "contorno" | "perigo" | "fantasma";
  desativado?: boolean;
  carregando?: boolean;
  icone?: ComponentProps<typeof Ionicons>["name"];
  style?: StyleProp<ViewStyle>;
  rotuloA11y?: string;
}) {
  const bg = { primario: C.teal, escuro: C.navy, contorno: C.bg, perigo: C.danger, fantasma: "transparent" }[tipo];
  const fg = tipo === "primario" || tipo === "contorno" || tipo === "fantasma" ? C.navy : "#fff";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloA11y}
      accessibilityState={{ disabled: !!desativado }}
      disabled={desativado || carregando}
      onPress={() => {
        toque();
        onPress();
      }}
      style={({ pressed }) => [
        st.botao,
        { backgroundColor: bg, opacity: desativado ? 0.45 : pressed ? 0.85 : 1 },
        tipo === "contorno" && { borderWidth: 1, borderColor: C.line },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icone && <Ionicons name={icone} size={18} color={fg} />}
          <T tom="h3" cor={fg}>
            {children}
          </T>
        </>
      )}
    </Pressable>
  );
}

export function Cartao({ children, style, suave }: { children: ReactNode; style?: StyleProp<ViewStyle>; suave?: boolean }) {
  return <View style={[st.cartao, suave && { backgroundColor: C.bgSoft, borderWidth: 0 }, style]}>{children}</View>;
}

export function Chip({
  children,
  ativo,
  onPress,
  rotuloA11y,
  riscado,
}: {
  children: ReactNode;
  ativo?: boolean;
  onPress: () => void;
  rotuloA11y?: string;
  riscado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloA11y}
      accessibilityState={{ selected: !!ativo }}
      onPress={() => {
        toque();
        onPress();
      }}
      style={[st.chip, ativo && { backgroundColor: C.navy, borderColor: C.navy }]}
    >
      <T tom="h3" cor={ativo ? "#fff" : riscado ? C.muted : C.navy} style={riscado ? { textDecorationLine: "line-through" } : undefined}>
        {children}
      </T>
    </Pressable>
  );
}

export function Selo({ children, cor = C.tealDark, fundo = C.tealSoft }: { children: ReactNode; cor?: string; fundo?: string }) {
  return (
    <View style={[st.selo, { backgroundColor: fundo }]}>
      <T tom="rotulo" cor={cor}>
        {children}
      </T>
    </View>
  );
}

export function Linha({ a, b, destaque, cor }: { a: string; b: string; destaque?: boolean; cor?: string }) {
  return (
    <View style={st.linha}>
      <T tom={destaque ? "h3" : "corpo"} cor={cor ?? C.text}>
        {a}
      </T>
      <T tom={destaque ? "h3" : "corpo"} cor={cor ?? C.text} style={{ fontVariant: ["tabular-nums"] }}>
        {b}
      </T>
    </View>
  );
}

export function Aviso({ children, icone = "information-circle-outline" }: { children: ReactNode; icone?: ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <View style={st.aviso}>
      <Ionicons name={icone} size={18} color={C.muted} />
      <T tom="pequeno" cor={C.muted} style={{ flex: 1 }}>
        {children}
      </T>
    </View>
  );
}

export const st = StyleSheet.create({
  botao: {
    minHeight: 52,
    borderRadius: R.pill,
    paddingHorizontal: S.xl,
    flexDirection: "row",
    gap: S.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cartao: { backgroundColor: C.bg, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: S.lg },
  chip: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  selo: { alignSelf: "flex-start", borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, gap: S.md },
  aviso: { flexDirection: "row", gap: S.sm, padding: S.md, borderRadius: R.md, backgroundColor: C.bgSoft },
  tela: { flex: 1, backgroundColor: C.bg },
  conteudo: { padding: S.lg, gap: S.lg, paddingBottom: 48 },
});
