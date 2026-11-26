import { Carregando } from "@/components/tipe/Carregando";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink, MonitorPlay, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createStation, deleteStation, listStations, rotateStation, setStationActive, type Station,
} from "@/lib/tipe/stations.functions";

const SETOR = { kitchen: "Cozinha", bar: "Bar", all: "Cozinha e bar" } as const;

/** Links de cozinha e bar: um por tela, criados pelo dono ou gerente. Sem usuário nem senha. */
export function EstacoesConfig({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const listar = useServerFn(listStations);
  const criar = useServerFn(createStation);
  const girar = useServerFn(rotateStation);
  const ativar = useServerFn(setStationActive);
  const remover = useServerFn(deleteStation);
  const lista = useQuery({ queryKey: ["estacoes", slug], queryFn: () => listar({ data: { slug } }) });
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState<Station["sector"]>("kitchen");
  // O link completo só existe logo depois de criar ou trocar; depois disso só o hash fica no banco.
  const [links, setLinks] = useState<Record<string, string>>({});
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const urlDe = (token: string) => `${origem}/${slug}/estacao?t=${token}`;
  const refresh = () => qc.invalidateQueries({ queryKey: ["estacoes", slug] });

  const novo = useMutation({
    mutationFn: () => criar({ data: { slug, name: nome, sector: setor } }),
    onSuccess: (r) => { setLinks((l) => ({ ...l, [r.id]: urlDe(r.token) })); setNome(""); toast.success("Estação criada. Copie o link agora."); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const trocar = useMutation({
    mutationFn: (id: string) => girar({ data: { slug, id } }),
    onSuccess: (r, id) => { setLinks((l) => ({ ...l, [id]: urlDe(r.token) })); toast.success("Novo link gerado. O anterior parou de funcionar."); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const alternar = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => ativar({ data: { slug, ...v } }),
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });
  const apagar = useMutation({
    mutationFn: (id: string) => remover({ data: { slug, id } }),
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <MonitorPlay className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="font-semibold">Telas da cozinha e do bar</h3>
            <p className="text-sm text-muted-foreground">
              Crie um link para cada tela e abra no PC, tablet ou monitor do setor. Não precisa de conta de garçom: a tela só mostra e move os pedidos do próprio setor. Só dono e gerente criam links.
            </p>
          </div>

          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (nome.trim().length >= 2) novo.mutate(); }}>
            <label className="min-w-40 flex-1 text-sm">
              <span className="mb-1 block text-muted-foreground">Nome da tela</span>
              <Input value={nome} maxLength={40} placeholder="Ex.: Cozinha quente" onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Setor</span>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={setor} onChange={(e) => setSetor(e.target.value as Station["sector"])}>
                {(Object.keys(SETOR) as (keyof typeof SETOR)[]).map((k) => <option key={k} value={k}>{SETOR[k]}</option>)}
              </select>
            </label>
            <Button type="submit" disabled={novo.isPending || nome.trim().length < 2}><Plus className="mr-1 h-4 w-4" />Criar link</Button>
          </form>

          {lista.isLoading && <Carregando tamanho="sm" texto="Carregando" />}
          {lista.error && <p className="text-sm text-destructive">{(lista.error as Error).message}</p>}
          {lista.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tela criada ainda.</p>}
          <ul className="space-y-2">
            {(lista.data ?? []).map((s) => {
              const url = links[s.id];
              return (
                <li key={s.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{s.name} <span className="text-xs font-normal text-muted-foreground">· {SETOR[s.sector]}{s.active ? "" : " · desativada"}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {s.lastSeenAt ? `Visto por último às ${new Date(s.lastSeenAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Ainda não aberta"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={trocar.isPending} onClick={() => { if (window.confirm("Gerar novo link? A tela que usa o link atual para de funcionar até abrir o novo.")) trocar.mutate(s.id); }}><RefreshCw className="mr-1 h-4 w-4" />Novo link</Button>
                      <Button size="sm" variant="ghost" onClick={() => alternar.mutate({ id: s.id, active: !s.active })}>{s.active ? "Desativar" : "Ativar"}</Button>
                      <Button size="sm" variant="ghost" aria-label={`Remover ${s.name}`} onClick={() => { if (window.confirm(`Remover a tela "${s.name}"? O link deixa de funcionar.`)) apagar.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {url && (
                    <div className="mt-2 space-y-2">
                      <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={`Link da tela ${s.name}`} />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(url).then(() => toast.success("Link copiado")); }}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
                        <Button size="sm" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Abrir</a></Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Este link aparece só agora. Guarde ou abra na tela do setor. Se perder, gere um novo.</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
