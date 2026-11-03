// Estado do app em modo demonstração (memória do aparelho durante a sessão).
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ReservationStatus } from "@core/reservas";

export type Reserva = {
  codigo: string;
  restauranteId: string;
  inicio: string;
  pessoas: number;
  mesa: string;
  nome: string;
  ocasiao: string;
  status: ReservationStatus;
  garantia: number;
  garantiaMetodo?: string;
  garantiaFim?: "devolvida" | "retida" | "credito";
  pago?: number;
  gorjeta?: number;
  nota?: number;
};

export type EntradaFila = {
  restauranteId: string;
  nome: string;
  pessoas: number;
  posicao: number;
  status: "aguardando" | "convocado" | "sentou" | "saiu";
  ate?: string;
};

type Estado = {
  nome: string;
  setNome: (n: string) => void;
  reservas: Reserva[];
  salvarReserva: (r: Reserva) => void;
  atualizarReserva: (codigo: string, p: Partial<Reserva>) => void;
  fila: EntradaFila | null;
  setFila: (f: EntradaFila | null) => void;
  favoritos: string[];
  alternarFavorito: (id: string) => void;
  novoCodigo: () => string;
};

const Ctx = createContext<Estado | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [nome, setNome] = useState("Lucas");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [fila, setFila] = useState<EntradaFila | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [seq, setSeq] = useState(4821);
  const v = useMemo<Estado>(
    () => ({
      nome,
      setNome,
      reservas,
      salvarReserva: (r) => setReservas((xs) => [r, ...xs.filter((x) => x.codigo !== r.codigo)]),
      atualizarReserva: (codigo, p) =>
        setReservas((xs) => xs.map((x) => (x.codigo === codigo ? { ...x, ...p } : x))),
      fila,
      setFila,
      favoritos,
      alternarFavorito: (id) =>
        setFavoritos((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      novoCodigo: () => {
        setSeq((s) => s + 1);
        return `TG-${seq}`;
      },
    }),
    [nome, reservas, fila, favoritos, seq],
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useGuest() {
  const v = useContext(Ctx);
  if (!v) throw new Error("GuestProvider ausente");
  return v;
}
