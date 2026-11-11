// Na web (prévia e prints), o mapa nativo não existe: desenhamos um mapa simples de Fortaleza com
// os pinos nas coordenadas fictícias, só para a demonstração.
import { Pressable, View } from "react-native";
import { C } from "@/constants/theme";
import { T } from "@/components/ui";
import type { Restaurante } from "@/lib/demo";
import { Pino } from "./Pino";

const B = { n: -3.712, s: -3.746, o: -38.528, l: -38.484 };

export function Mapa({ lista, selecionado, onSelect }: { lista: Restaurante[]; selecionado?: string; onSelect: (id: string) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#EAF1EE", overflow: "hidden" }}>
      <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "22%", backgroundColor: "#BFE6F2" }} />
      {[18, 42, 66, 84].map((y) => (
        <View key={`h${y}`} style={{ position: "absolute", left: 0, right: "22%", top: `${y}%`, height: 6, backgroundColor: "#fff" }} />
      ))}
      {[14, 38, 60].map((x) => (
        <View key={`v${x}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, width: 6, backgroundColor: "#fff" }} />
      ))}
      <View style={{ position: "absolute", left: "40%", top: "44%", width: "18%", height: "20%", borderRadius: 16, backgroundColor: "#CFE8D5" }} />
      <T tom="rotulo" cor="#5C8FA3" style={{ position: "absolute", right: 12, top: "48%" }}>
        Oceano
      </T>
      <T tom="rotulo" cor={C.muted} style={{ position: "absolute", left: 12, bottom: 12 }}>
        Mapa ilustrativo · demonstração
      </T>
      {lista.map((r) => {
        const x = ((r.porta.lng - B.o) / (B.l - B.o)) * 78;
        const y = ((B.n - r.porta.lat) / (B.n - B.s)) * 100;
        return (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${r.nome} no mapa`}
            onPress={() => onSelect(r.id)}
            style={{ position: "absolute", left: `${Math.max(2, Math.min(60, x))}%`, top: `${Math.max(4, Math.min(88, y))}%` }}
          >
            <Pino r={r} ativo={r.id === selecionado} />
          </Pressable>
        );
      })}
    </View>
  );
}
