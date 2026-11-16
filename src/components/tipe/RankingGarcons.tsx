import { Award, Medal, Trophy } from "lucide-react";
import { calcularRanking, metasDoGarcom, type DadosGarcom, type Meta } from "@/lib/tipe/garcom-ranking";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nota = (n: number | null) => (n === null ? "–" : n.toFixed(1).replace(".", ","));

function Barra({ m }: { m: Meta }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-2 text-xs"><span className={m.cumprida ? "font-semibold text-primary" : ""}>{m.cumprida ? "✓ " : ""}{m.rotulo}</span><span className="tabular-nums text-muted-foreground">{m.chave === "nota" ? nota(m.atual || null) : m.atual}/{m.alvo}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={m.rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(m.progresso * 100)}><div className={`h-full rounded-full ${m.cumprida ? "bg-primary" : "bg-primary/50"}`} style={{ width: `${Math.round(m.progresso * 100)}%` }} /></div>
    </li>
  );
}

/** Visão do restaurante: ranking de todos os garçons ativos do período. */
export function RankingGestao({ garcons, dias }: { garcons: (DadosGarcom & { teamTips?: number })[]; dias: number }) {
  const r = calcularRanking(garcons);
  if (r.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-highlight" /> Ranking do período ({dias} dias)</h3><span className="text-xs text-muted-foreground">Pontos: 40% gorjeta, 35% nota, 25% mesas pagas pelo QR</span></div>
      <ol className="mt-3 divide-y divide-border">
        {r.map((w) => {
          const metas = metasDoGarcom(w);
          const feitas = metas.filter((m) => m.cumprida).length;
          return (
            <li key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
              <span className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${w.posicao === 1 ? "bg-highlight/20 text-highlight" : "bg-muted text-muted-foreground"}`}>{w.posicao === 1 ? <Medal className="size-4" /> : w.posicao}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{w.name}{w.destaque && <span className="ml-2 rounded-full bg-highlight/20 px-2 py-0.5 text-xs font-semibold text-highlight">Destaque</span>}</span><span className="block text-xs text-muted-foreground">{w.tablesPaid} mesas pagas · {brl(w.tips)} em gorjetas · nota {nota(w.ratingAvg)} ({w.ratingCount})</span></span>
              <span className="text-right"><span className="block text-lg font-bold tabular-nums">{w.pontos.toFixed(1).replace(".", ",")}</span><span className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Award className="size-3" />{feitas}/{metas.length} metas</span></span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">Só reconhecimento: o ranking não muda a divisão da gorjeta (70% garçom). Prêmios, se houver, são decididos pelo restaurante. Garçons inativos ficam de fora.</p>
    </div>
  );
}

/** Visão do garçom: só a própria posição, pontos e metas. Nunca os números dos colegas. */
export function MeuRanking({ r }: { r: { posicao: number; total: number; pontos: number; destaque: boolean; mesasPagas: number; notaMedia: number | null; avaliacoes: number; metas: Meta[] } | null }) {
  if (!r) return null;
  return (
    <section className="surface-card p-5" aria-label="Meu ranking">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 font-display font-semibold"><Trophy className="size-4 text-highlight" /> Meu ranking (30 dias)</h2><p className="mt-1 text-xs text-muted-foreground">{r.mesasPagas} mesas pagas pelo QR · nota {nota(r.notaMedia)} ({r.avaliacoes} avaliações)</p></div>
        <div className="text-right"><p className="text-2xl font-bold tabular-nums">{r.posicao}º<span className="text-sm font-normal text-muted-foreground"> de {r.total}</span></p><p className="text-xs text-muted-foreground">{r.pontos.toFixed(1).replace(".", ",")} pontos</p></div>
      </div>
      {r.destaque && <p className="mt-3 rounded-lg bg-highlight/15 px-3 py-2 text-sm font-semibold text-highlight">Você é o destaque do período. Parabéns!</p>}
      <ul className="mt-4 space-y-3">{r.metas.map((m) => <Barra key={m.chave} m={m} />)}</ul>
    </section>
  );
}
