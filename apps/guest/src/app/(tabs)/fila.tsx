// Fila presencial: só entra quem está na porta (QR da porta + localização), igual à regra do site.
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { insideRadius, walkinPositionLabel } from "@core/fila";
import { C, R, S } from "@/constants/theme";
import { Aviso, Botao, Cartao, Selo, T, st, toque } from "@/components/ui";
import { RESTAURANTES, restaurante } from "@/lib/demo";
import { useGuest } from "@/lib/store";

type Etapa = "inicio" | "camera" | "local" | "grupo";

export default function Fila() {
  const { fila, setFila, nome } = useGuest();
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [rid, setRid] = useState<string>("mare");
  const [pessoas, setPessoas] = useState(2);
  const [erro, setErro] = useState<string | null>(null);
  const [checando, setChecando] = useState(false);
  const [perm, pedirPerm] = useCameraPermissions();
  const r = restaurante(rid);

  const lerQR = (dado: string) => {
    const achado = RESTAURANTES.find((x) => dado.includes(`/${x.id}/fila`));
    if (!achado) {
      setErro("Este QR não é de uma porta Tipe. Procure o adesivo na entrada.");
      setEtapa("inicio");
      return;
    }
    setRid(achado.id);
    setErro(null);
    setEtapa("local");
  };

  const conferirLocal = async (simular: boolean) => {
    setChecando(true);
    setErro(null);
    try {
      let pos = { lat: r.porta.lat + 0.0002, lng: r.porta.lng, acc: 20 };
      if (!simular) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErro("Sem a localização não dá para confirmar que você está na porta. Você pode pedir ao recepcionista.");
          return;
        }
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        pos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? 999 };
      }
      const ok = insideRadius({ place: { lat: r.porta.lat, lng: r.porta.lng, radiusM: r.porta.raio }, lat: pos.lat, lng: pos.lng, accuracyM: pos.acc });
      if (!ok.ok) {
        setErro(ok.reason === "imprecisa" ? "A localização está imprecisa. Vá para perto da porta e tente de novo." : `Você parece longe do ${r.nome}. A fila abre só na porta.`);
        return;
      }
      setEtapa("grupo");
    } finally {
      setChecando(false);
    }
  };

  if (fila && (fila.status === "aguardando" || fila.status === "convocado")) {
    const fr = restaurante(fila.restauranteId);
    const chamado = fila.status === "convocado";
    return (
      <SafeAreaView style={st.tela} edges={["top"]}>
        <ScrollView contentContainerStyle={st.conteudo}>
          <T tom="titulo">Fila</T>
          <View style={{ backgroundColor: chamado ? C.teal : C.navy, borderRadius: R.xl, padding: S.xl, gap: S.sm }}>
            <T tom="rotulo" cor={chamado ? C.navy : C.teal}>
              {fr.nome.toUpperCase()} · {fila.pessoas} PESSOAS
            </T>
            <T tom="titulo" cor={chamado ? C.navy : "#fff"}>
              {chamado ? "Sua mesa está pronta" : walkinPositionLabel(fila.posicao)}
            </T>
            <T tom="corpo" cor={chamado ? C.navy : "rgba(255,255,255,0.75)"}>
              {chamado ? "Vá até a recepção em até 5 minutos." : `Estimativa de ${fila.posicao * 8} min. Avisamos aqui quando chegar a sua vez.`}
            </T>
          </View>
          <Aviso>A posição é uma estimativa. Mesas grandes e reservas podem mudar a ordem.</Aviso>
          {!chamado && (
            <Botao
              tipo="contorno"
              icone="play-forward-outline"
              onPress={() =>
                setFila(fila.posicao <= 1 ? { ...fila, status: "convocado", posicao: 0 } : { ...fila, posicao: fila.posicao - 1 })
              }
            >
              Simular a fila andar
            </Botao>
          )}
          {chamado && (
            <Botao icone="checkmark-circle-outline" onPress={() => setFila({ ...fila, status: "sentou" })}>
              Cheguei na recepção
            </Botao>
          )}
          <Botao tipo="fantasma" onPress={() => setFila({ ...fila, status: "saiu" })}>
            Sair da fila
          </Botao>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (etapa === "camera" && Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => lerQR(data)}
        />
        <SafeAreaView edges={["bottom"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: S.lg, gap: S.sm }}>
          <T tom="h3" cor="#fff" style={{ textAlign: "center" }}>
            Aponte para o QR da porta
          </T>
          <Botao tipo="contorno" onPress={() => setEtapa("inicio")}>
            Cancelar
          </Botao>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={st.tela} edges={["top"]}>
      <ScrollView contentContainerStyle={st.conteudo}>
        <T tom="titulo">Fila</T>
        {fila?.status === "sentou" && (
          <Cartao suave>
            <T tom="h3">Bom apetite!</T>
            <T tom="pequeno" cor={C.muted}>
              Você foi para a mesa no {restaurante(fila.restauranteId).nome}.
            </T>
          </Cartao>
        )}
        {etapa === "inicio" && (
          <>
            <View style={{ alignItems: "center", gap: S.md, paddingVertical: S.xl }}>
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.tealSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="qr-code-outline" size={40} color={C.tealDark} />
              </View>
              <T tom="h1" style={{ textAlign: "center" }}>
                Chegou sem reserva?
              </T>
              <T tom="corpo" cor={C.muted} style={{ textAlign: "center" }}>
                Escaneie o QR da porta do restaurante. Conferimos que você está lá e guardamos seu lugar na fila.
              </T>
            </View>
            {Platform.OS !== "web" && (
              <Botao
                tipo="escuro"
                icone="scan-outline"
                onPress={async () => {
                  if (!perm?.granted) {
                    const p = await pedirPerm();
                    if (!p.granted) {
                      setErro("Sem a câmera, use o botão de demonstração abaixo ou peça ao recepcionista.");
                      return;
                    }
                  }
                  setEtapa("camera");
                }}
              >
                Escanear QR da porta
              </Botao>
            )}
            <Botao tipo="contorno" icone="flask-outline" onPress={() => lerQR("https://tipe.digital/mare/fila?t=demo")}>
              Simular QR da porta (demonstração)
            </Botao>
          </>
        )}
        {etapa === "local" && (
          <Cartao style={{ gap: S.md }}>
            <Selo>{r.nome}</Selo>
            <T tom="h2">Confirme que você está na porta</T>
            <T tom="corpo" cor={C.muted}>
              Usamos sua localização só agora, uma vez, para conferir a distância. Ela não fica salva.
            </T>
            <Botao icone="location-outline" carregando={checando} onPress={() => conferirLocal(false)}>
              Usar minha localização
            </Botao>
            <Botao tipo="fantasma" onPress={() => conferirLocal(true)}>
              Simular que estou na porta
            </Botao>
          </Cartao>
        )}
        {etapa === "grupo" && (
          <Cartao style={{ gap: S.lg }}>
            <Selo>{r.nome}</Selo>
            <T tom="h2">Quantas pessoas?</T>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.xl }}>
              <Passo d={-1} set={setPessoas} />
              <T tom="titulo" style={{ minWidth: 40, textAlign: "center" }}>
                {pessoas}
              </T>
              <Passo d={1} set={setPessoas} />
            </View>
            <Botao
              onPress={() => {
                setFila({ restauranteId: r.id, nome, pessoas, posicao: 3, status: "aguardando" });
                setEtapa("inicio");
              }}
            >
              Entrar na fila
            </Botao>
          </Cartao>
        )}
        {erro && <Aviso icone="alert-circle-outline">{erro}</Aviso>}
        <Aviso icone="flask-outline">Demonstração: restaurantes fictícios, nada é enviado.</Aviso>
      </ScrollView>
    </SafeAreaView>
  );
}

function Passo({ d, set }: { d: 1 | -1; set: (f: (p: number) => number) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={d === 1 ? "Mais uma pessoa" : "Menos uma pessoa"}
      onPress={() => {
        toque();
        set((p) => Math.min(8, Math.max(1, p + d)));
      }}
      style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={d === 1 ? "add" : "remove"} size={22} color={C.navy} />
    </Pressable>
  );
}
