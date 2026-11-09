// Mapa nativo: Apple Maps no iPhone e Google Maps no Android (react-native-maps). Sem cobrança
// por uso no app; no Android a publicação precisa de uma chave do Google Maps SDK (gratuita).
import MapView, { Marker } from "react-native-maps";
import type { Restaurante } from "@/lib/demo";
import { Pino } from "./Pino";

export function Mapa({ lista, selecionado, onSelect }: { lista: Restaurante[]; selecionado?: string; onSelect: (id: string) => void }) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{ latitude: -3.7300, longitude: -38.5050, latitudeDelta: 0.045, longitudeDelta: 0.045 }}
      showsUserLocation
    >
      {lista.map((r) => (
        <Marker key={r.id} coordinate={{ latitude: r.porta.lat, longitude: r.porta.lng }} onPress={() => onSelect(r.id)}>
          <Pino r={r} ativo={r.id === selecionado} />
        </Marker>
      ))}
    </MapView>
  );
}

