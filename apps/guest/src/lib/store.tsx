// Estado do app em modo demonstração (memória do aparelho durante a sessão).
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ReservationStatus } from "@core/reservas";
import { CREDITO_RESGATE, PONTOS_POR_RESGATE } from "@/lib/pontos";

const brlCurto = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  pontos: number;
  extrato: { t: string; pts: number }[];
  ganharPontos: (t: string, pts: number) => void;
  /** Crédito de pontos já trocado, em centavos, usado na próxima conta. */
  creditoPontos: number;
  resgatar: () => boolean;
  usarCredito: (c: number) => void;
};

const Ctx = createContext<Estado | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [nome, setNome] = useState("Lucas");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [fila, setFila] = useState<EntradaFila | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [seq, setSeq] = useState(4821);
  const [pontos, setPontos] = useState(700);
  const [extrato, setExtrato] = useState<{ t: string; pts: number }[]>([
    { t: "Boas-vindas ao Tipe Guest", pts: 300 },
    { t: "Jangada Café · reserva honrada", pts: 400 },
  ]);
  const [creditoPontos, setCreditoPontos] = useState(0);
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
      pontos,
      extrato,
      ganharPontos: (t, pts) => {
        setPontos((p) => p + pts);
        setExtrato((e) => [{ t, pts }, ...e]);
      },
      creditoPontos,
      resgatar: () => {
        if (pontos < PONTOS_POR_RESGATE) return false;
        setPontos((p) => p - PONTOS_POR_RESGATE);
        setExtrato((e) => [{ t: `Troca por ${brlCurto(CREDITO_RESGATE)} de crédito`, pts: -PONTOS_POR_RESGATE }, ...e]);
        setCreditoPontos((c) => c + CREDITO_RESGATE);
        return true;
      },
      usarCredito: (c) => setCreditoPontos((x) => Math.max(0, x - c)),
    }),
    [nome, reservas, fila, favoritos, seq, pontos, extrato, creditoPontos],
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useGuest() {
  const v = useContext(Ctx);
  if (!v) throw new Error("GuestProvider ausente");
  return v;
}
