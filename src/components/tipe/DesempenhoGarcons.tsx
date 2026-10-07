import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWaiterInsights } from "@/lib/tipe/waiter-insights.functions";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const periodos = [7, 30, 90] as const;

export function DesempenhoGarcons({ slug }: { slug: string }) {
  const fetchInsights = useServerFn(getWaiterInsights);
  const [dias, setDias] = useState<number>(30);
  const [sel, setSel] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["waiter-insights", slug, dias], queryFn: () => fetchInsights({ data: { slug, days: dias } }) });
  const lista = q.data ?? [];
  const grafico = lista.map((w) => ({ nome: w.name.split(" ")[0], gorjeta: Math.round(w.tips * 100) / 100, nota: w.ratingAvg ? Math.round(w.ratingAvg * 10) / 10 : 0 }));
  const atual = lista.find((w) => w.id === sel) ?? null;
  const comentarios = atual ? atual.comments.map((c) => ({ ...c, nome: atual.name })) : lista.flatMap((w) => w.comments.map((c) => ({ ...c, nome: w.name }))).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Garçons: avaliações e gorjetas</h2>
          <p className="text-sm text-muted-foreground">Gorjetas extras recebidas e o que os clientes comentaram sobre cada atendimento.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {periodos.map((p) => (
            <Button key={p} size="sm" variant={dias === p ? "default" : "ghost"} onClick={() => setDias(p)}>{p} dias</Button>
          ))}
        </div>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {q.error && <p className="text-sm text-destructive">Não foi possível carregar os dados.</p>}
      {q.data && lista.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Cadastre garçons em Equipe e garçons para ver o desempenho aqui.</p>}

      {lista.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Gorjetas por garçom</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12, fill: "currentColor" }} />
                    <YAxis tick={{ fontSize: 12, fill: "currentColor" }} tickFormatter={(v: number) => `R$${v}`} width={56} />
                    <Tooltip formatter={(v: number) => brl(v)} cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="gorjeta" name="Gorjetas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Nota média (1 a 5)</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 12, fill: "currentColor" }} />
                    <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: "currentColor" }} width={32} />
                    <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="nota" name="Nota" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((w) => (
              <button key={w.id} type="button" onClick={() => setSel(sel === w.id ? null : w.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${sel === w.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{w.name}{!w.active && <span className="ml-2 text-xs font-normal text-muted-foreground">inativo</span>}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold tabular-nums"><Star className="h-4 w-4 fill-highlight text-highlight" />{w.ratingAvg ? w.ratingAvg.toFixed(1) : "–"}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div><div className="text-base font-semibold text-foreground tabular-nums">{brl(w.tips)}</div>bruto</div>
                  <div><div className="text-base font-semibold text-foreground tabular-nums">{w.ratingCount}</div>avaliações</div>
                  <div><div className="text-base font-semibold text-foreground tabular-nums">{w.comments.length}</div>comentários</div>
                </div>
                <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Equipe {brl(w.teamTips)}</span> · Taxa TIPE {brl(w.tipeFee)}</div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" />Comentários {atual ? `sobre ${atual.name}` : "de todos"}</h3>
            {comentarios.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum comentário no período.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {comentarios.map((c, i) => (
                  <li key={i} className="py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= c.stars ? "fill-highlight text-highlight" : "text-border"}`} />)}</span>
                      <span className="font-semibold text-foreground">{c.nome}</span> · Mesa {c.table} · {data(c.at)}
                    </div>
                    <p className="mt-1 text-sm">{c.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
