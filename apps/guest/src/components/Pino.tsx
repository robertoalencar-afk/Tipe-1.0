import { View } from "react-native";
import { C, R } from "@/constants/theme";
import { T } from "@/components/ui";
import type { Restaurante } from "@/lib/demo";

export function Pino({ r, ativo }: { r: Restaurante; ativo: boolean }) {
  return (
    <View
      style={{
        backgroundColor: ativo ? C.navy : r.destaque ? C.teal : "#fff",
        borderRadius: R.pill,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: ativo ? C.navy : C.line,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <T tom="rotulo" cor={ativo ? "#fff" : C.navy}>
        ★ {r.nota} · {r.nome}
      </T>
    </View>
  );
}
