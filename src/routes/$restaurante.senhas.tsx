import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { getTicketBoard } from "@/lib/tipe/orders.functions";
import { beep, unlockSound } from "@/lib/tipe/beep";
import { TipeLogo } from "@/components/tipe/Logo";

// Painel de senhas para a TV da loja (como o Painel de Senha do Colibri).
// Sem login: autorizado pelo token do dispositivo gerado na aba Cozinha e bar.
export const Route = createFileRoute("/$restaurante/senhas")({
  ssr: false,
  validateSearch: z.object({ t: z.string().max(64).optional() }),
  head: () => ({
    meta: [
      { title: "Painel de senhas — TIPE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PainelSenhas,
});

const DESTAQUE_MS = 20000;

function PainelSenhas() {
  const { restaurante } = Route.useParams();
  const { t } = Route.useSearch();
  const fetchBoard = useServerFn(getTicketBoard);
  const board = useQuery({
    queryKey: ["senhas", restaurante, t],
    queryFn: () => fetchBoard({ data: { slug: restaurante, token: t ?? "" } }),
    enabled: !!t && t.length >= 16,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    retry: true,
  });
  const [somLiberado, setSomLiberado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const data = board.data && !("error" in board.data) ? board.data : null;

  // Bipa a cada senha chamada (nova ou chamada de novo), mas não na primeira carga.
  const vistas = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const chaves = data.ready.map((r) => `${r.id}:${r.calledAt}`);
    if (vistas.current && somLiberado && chaves.some((k) => !vistas.current!.has(k))) beep(3, "chamada");
    vistas.current = new Set([...(vistas.current ?? []), ...chaves]);
  }, [data, somLiberado]);

  if (!t || t.length < 16 || (board.data && "error" in board.data)) {
    return (
      <Tela>
        <div className="m-auto max-w-lg text-center">
          <h1 className="font-display text-3xl font-bold">Painel de senhas</h1>
          <p className="mt-3 text-lg opacity-80">
            {board.data && "error" in board.data && board.data.error === "not_found"
              ? "Restaurante não encontrado."
              : "Este link não é válido ou foi trocado. Peça ao caixa o link atual do painel, na aba Cozinha e bar."}
          </p>
        </div>
      </Tela>
    );
  }

  // Desconta a diferença de relógio entre a TV e o servidor para o destaque não falhar.
  const atraso = data ? Date.now() - new Date(data.serverTime).getTime() : 0;
  const destaque = data?.ready.find((r) => agora - atraso - new Date(r.calledAt).getTime() < DESTAQUE_MS) ?? null;

  return (
    <Tela onClick={() => { if (!somLiberado && unlockSound()) setSomLiberado(true); }}>
      <header className="flex items-center justify-between px-8 py-4">
        <span className="font-display text-2xl font-bold">{data?.restaurantName ?? ""}</span>
        <span className="font-display text-3xl font-bold tabular-nums">{new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </header>

      {board.isError && <p className="mx-8 rounded-xl bg-destructive/80 px-4 py-2 text-center text-lg">Sem conexão. Tentando de novo…</p>}

      <main className="grid flex-1 grid-cols-1 gap-6 px-8 pb-8 lg:grid-cols-[2fr_3fr]">
        <section aria-label="Preparando" className="flex flex-col rounded-3xl bg-white/5 p-6">
          <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-widest opacity-80">Preparando</h2>
          <ul className="grid grid-cols-3 gap-3 xl:grid-cols-4">
            {(data?.preparing ?? []).map((p) => (
              <li key={p.id} className="rounded-2xl bg-white/10 py-3 text-center">
                <div className="font-display text-4xl font-bold tabular-nums">{p.ticket}</div>
                {p.name && <div className="truncate px-1 text-sm opacity-70">{p.name}</div>}
              </li>
            ))}
          </ul>
          {data && data.preparing.length === 0 && <p className="m-auto text-lg opacity-60">Nenhum pedido em preparo</p>}
        </section>

        <section aria-label="Pronto para retirar" aria-live="polite" className="flex flex-col rounded-3xl bg-primary/15 p-6">
          <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-widest text-primary">Pronto, pode retirar</h2>
          {destaque && (
            <div className="mb-5 animate-pulse rounded-3xl bg-primary py-6 text-center text-primary-foreground">
              <div className="font-display text-[9rem] font-extrabold leading-none tabular-nums">{destaque.ticket}</div>
              {destaque.name && <div className="mt-2 font-display text-4xl font-bold">{destaque.name}</div>}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {(data?.ready ?? []).filter((r) => r.id !== destaque?.id).map((r) => (
              <li key={r.id} className="rounded-2xl bg-primary/25 py-4 text-center">
                <div className="font-display text-6xl font-extrabold tabular-nums">{r.ticket}</div>
                {r.name && <div className="truncate px-2 text-lg font-semibold">{r.name}</div>}
              </li>
            ))}
          </ul>
          {data && data.ready.length === 0 && <p className="m-auto text-lg opacity-60">Aguarde sua senha aparecer aqui</p>}
        </section>
      </main>

      <footer className="flex items-center justify-between px-8 pb-4 text-sm opacity-60">
        <span>{somLiberado ? "Som ativado" : "Toque na tela para ativar o som"}</span>
        <TipeLogo className="h-6" />
      </footer>
    </Tela>
  );
}

function Tela({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="flex min-h-screen flex-col text-secondary-foreground" style={{ background: "var(--gradient-brand)" }}>
      {children}
    </div>
  );
}
