import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listLaunchStates, setLaunchState, type LinhaLancamento } from "@/lib/tipe/launch-state.functions";
import { ESTADOS_LANCAMENTO, TEXTOS_LANCAMENTO, type EstadoLancamento } from "@/lib/tipe/launch-state";

const NOMES: Record<string, string> = { order: "Tipe Order" };

/** Backoffice: estado de lançamento das páginas de produto (CTA, selo e FAQ do site). */
export function LaunchStatesAdmin() {
  const load = useServerFn(listLaunchStates);
  const save = useServerFn(setLaunchState);
  const [linhas, setLinhas] = useState<LinhaLancamento[] | null>(null);
  const [escolha, setEscolha] = useState<Record<string, EstadoLancamento>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    load()
      .then((r) => {
        setLinhas(r);
        setEscolha(Object.fromEntries(r.map((l) => [l.slug, l.estado])));
      })
      .catch(() => setErro("Não foi possível ler os estados de lançamento."));
  }, [load]);

  async function salvar(slug: string) {
    const estado = escolha[slug];
    if (!estado) return;
    setBusy(slug);
    try {
      await save({ data: { slug, estado } });
      setLinhas((ls) => ls?.map((l) => (l.slug === slug ? { ...l, estado, atualizadoEm: new Date().toISOString() } : l)) ?? null);
      toast.success(`${NOMES[slug] ?? slug}: ${TEXTOS_LANCAMENTO[estado].nome}. O site já mostra o novo estado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h3 className="font-display font-bold">Estado de lançamento no site</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Muda o botão principal, o selo do menu e a resposta de "Quando estará disponível?" na página do produto. Nunca mostra data.
      </p>
      {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
      {linhas?.some((l) => !l.tabelaDisponivel) && (
        <p className="mt-3 rounded-md bg-muted p-2 text-xs">
          A tabela product_launch_states ainda não existe neste banco (migração 0028). O site usa o padrão do catálogo.
        </p>
      )}
      <ul className="mt-4 space-y-4">
        {linhas?.map((l) => (
          <li key={l.slug} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="text-sm">
              {NOMES[l.slug] ?? l.slug}{" "}
              <span className="text-xs text-muted-foreground">
                (agora: {TEXTOS_LANCAMENTO[l.estado].nome}
                {l.atualizadoEm ? `, desde ${new Date(l.atualizadoEm).toLocaleString("pt-BR")}` : ", padrão do catálogo"})
              </span>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={escolha[l.slug] ?? l.estado}
                onChange={(e) => setEscolha({ ...escolha, [l.slug]: e.target.value as EstadoLancamento })}
              >
                {ESTADOS_LANCAMENTO.map((s) => (
                  <option key={s} value={s}>
                    {TEXTOS_LANCAMENTO[s].nome} · botão "{TEXTOS_LANCAMENTO[s].cta}"
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={busy === l.slug || escolha[l.slug] === l.estado}
              onClick={() => salvar(l.slug)}
            >
              {busy === l.slug ? "Salvando…" : "Salvar estado"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
