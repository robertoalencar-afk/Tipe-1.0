import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getStationBoard, stationBump } from "@/lib/tipe/stations.functions";
import { QuadroKds } from "@/components/tipe/Kds";

// Tela da cozinha ou do bar sem login pessoal. O dono ou gerente cria o link em Gestão
// (Equipe > Cozinha e bar) e abre uma vez no PC, tablet ou monitor do setor.
// O token vai no endereço; a estação só vê e move os pedidos do próprio setor.
export const Route = createFileRoute("/$restaurante/estacao")({
  ssr: false,
  validateSearch: z.object({ t: z.string().max(64).optional() }),
  head: () => ({
    meta: [
      { title: "Estação — TIPE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Estacao,
});

const NOME_SETOR = { kitchen: "Cozinha", bar: "Bar", all: "Cozinha e bar" } as const;

function Relogio() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-display text-lg font-bold tabular-nums">{agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>;
}

function Estacao() {
  const { restaurante } = Route.useParams();
  const { t } = Route.useSearch();
  const token = t ?? "";
  const valido = token.length >= 32;
  const fetchBoard = useServerFn(getStationBoard);
  const bump = useServerFn(stationBump);
  const qc = useQueryClient();
  const board = useQuery({
    queryKey: ["estacao", restaurante, token],
    queryFn: () => fetchBoard({ data: { slug: restaurante, token } }),
    enabled: valido,
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
    retry: true,
  });
  const data = board.data && !("error" in board.data) ? board.data : null;

  if (!valido || (board.data && "error" in board.data)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-2xl font-bold">Estação da cozinha e do bar</h1>
          <p className="mt-3 text-muted-foreground">
            Este link não é válido, foi trocado ou foi desativado. Peça ao dono ou gerente o link atual, em Gestão, na área de Equipe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 bg-secondary px-4 py-2 text-secondary-foreground">
        <span className="font-display font-bold">
          {data ? `${data.restaurantName} · ${data.stationName}` : "Carregando…"}
          {data && <span className="ml-2 text-sm font-normal opacity-80">{NOME_SETOR[data.sector]}</span>}
        </span>
        <Relogio />
      </header>
      {board.isError && <p className="bg-destructive px-4 py-2 text-center text-sm text-destructive-foreground">Sem conexão. Tentando de novo…</p>}
      <QuadroKds
        itens={data?.items ?? []}
        carregando={board.isLoading}
        setorFixo={data?.sector ?? "all"}
        telaCheia
        onMover={(v) => bump({ data: { slug: restaurante, token, ...v } })}
        onAtualizar={() => qc.invalidateQueries({ queryKey: ["estacao", restaurante, token] })}
      />
    </div>
  );
}
