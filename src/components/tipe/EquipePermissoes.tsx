import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Pause, Play, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PainelLateral, StatusBadge, horaBR, inputCls } from "@/components/tipe/painel/ui";
import { createInvite, getEquipe, removerPessoa, revokeInvite, setPapel, setPermissoes, setSuspensao } from "@/lib/tipe/equipe.functions";
import { efetivas, PADRAO, PAPEL_DESCRICAO, PAPEL_LABEL, PERMISSOES, TETO, type PapelRestaurante } from "@/lib/tipe/permissoes";

const PAPEIS = ["manager", "cashier", "waiter"] as const;

/** Seção "Equipe e Permissões" do Tipe Gestão: pessoas, papéis, permissões extras, convites e histórico. */
export function EquipePermissoes({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const fetchEquipe = useServerFn(getEquipe);
  const query = useQuery({ queryKey: ["equipe", slug], queryFn: () => fetchEquipe({ data: { slug } }) });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["equipe", slug] });
  const [sel, setSel] = useState<string | null>(null);
  const [aba, setAba] = useState<"pessoas" | "convites" | "historico">("pessoas");
  const convidar = useServerFn(createInvite);
  const revogar = useServerFn(revokeInvite);
  const trocar = useServerFn(setPapel);
  const salvarPermissoes = useServerFn(setPermissoes);
  const suspender = useServerFn(setSuspensao);
  const remover = useServerFn(removerPessoa);
  const [f, setF] = useState({ name: "", email: "", role: "cashier" as (typeof PAPEIS)[number] });
  const [link, setLink] = useState<string | null>(null);
  const erro = (e: Error) => toast.error(e.message);
  const mConvite = useMutation({ mutationFn: () => convidar({ data: { slug, ...f } }), onSuccess: (r) => { setLink(`${window.location.origin}/convite/${r.token}`); if (r.emailEnviado) toast.success(`Convite enviado para ${f.email}`); else toast.warning("Não deu para mandar o e-mail agora. Copie o link e envie por WhatsApp."); setF({ ...f, name: "", email: "" }); recarregar(); }, onError: erro });
  const mRevogar = useMutation({ mutationFn: (id: string) => revogar({ data: { slug, id } }), onSuccess: recarregar, onError: erro });
  const mPapel = useMutation({ mutationFn: (v: { userId: string; role: (typeof PAPEIS)[number] }) => trocar({ data: { slug, ...v } }), onSuccess: () => { toast.success("Papel alterado"); recarregar(); }, onError: erro });
  const mPerms = useMutation({ mutationFn: (v: { userId: string; permissoes: string[] }) => salvarPermissoes({ data: { slug, ...v } }), onSuccess: () => { toast.success("Permissões salvas"); recarregar(); }, onError: erro });
  const mSusp = useMutation({ mutationFn: (v: { userId: string; suspenso: boolean }) => suspender({ data: { slug, ...v } }), onSuccess: recarregar, onError: erro });
  const mRem = useMutation({ mutationFn: (userId: string) => remover({ data: { slug, userId } }), onSuccess: () => { toast.success("Removido"); setSel(null); recarregar(); }, onError: erro });

  const d = query.data;
  const pessoa = d?.pessoas.find((p: any) => p.userId === sel);
  const papelDe = (p: { papeis: string[] }) => (p.papeis.includes("owner") ? "owner" : (PAPEIS.find((r) => p.papeis.includes(r)) ?? "waiter")) as PapelRestaurante;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["owner", ...PAPEIS] as PapelRestaurante[]).map((p) => (
          <div key={p} className="surface-card p-4"><p className="font-semibold">{PAPEL_LABEL[p]}</p><p className="mt-1 text-xs text-muted-foreground">{PAPEL_DESCRICAO[p]}</p></div>
        ))}
      </div>
      <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1 text-sm w-fit">
        {([["pessoas", "Pessoas"], ["convites", "Convites"], ["historico", "Histórico"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`rounded-md px-3 py-1.5 font-medium ${aba === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {aba === "pessoas" && (
        <ul className="surface-card divide-y divide-border">
          {d?.pessoas.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhuma pessoa ainda. Crie um convite.</li>}
          {d?.pessoas.map((p: any) => (
            <li key={p.userId}>
              <button type="button" onClick={() => setSel(p.userId)} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50">
                <span><span className="block text-sm font-semibold">{p.nome}</span><span className="text-xs text-muted-foreground">{p.email}</span></span>
                <span className="flex items-center gap-2">{(p.extras.length > 0 || p.removidas.length > 0) && <StatusBadge tone="info">Permissões ajustadas</StatusBadge>}{p.suspenso && <StatusBadge tone="warning">Suspenso</StatusBadge>}<StatusBadge tone={p.papeis.includes("owner") ? "brand" : "neutral"}>{PAPEL_LABEL[papelDe(p)]}</StatusBadge></span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aba === "convites" && (
        <div className="grid gap-4 md:grid-cols-2">
          <form className="surface-card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); mConvite.mutate(); }}>
            <h2 className="flex items-center gap-2 font-display font-semibold"><UserPlus className="size-4" /> Convidar pessoa</h2>
            <p className="text-xs text-muted-foreground">A pessoa recebe o convite por e-mail, com link de uso único válido por 7 dias. O link também aparece aqui para mandar por WhatsApp.</p>
            <Input required placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
            <Input required type="email" placeholder="E-mail da pessoa" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as typeof f.role })} aria-label="Papel">{PAPEIS.map((r) => <option key={r} value={r}>{PAPEL_LABEL[r]}</option>)}</select>
            <Button type="submit" variant="brand" className="w-full" disabled={mConvite.isPending}>Enviar convite</Button>
            {link && (
              <div className="rounded-lg bg-brand-soft p-3 text-sm"><p className="mb-2 font-medium">Link do convite (aparece só agora)</p><p className="break-all text-xs">{link}</p>
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(link).then(() => toast.success("Link copiado")); }}><Copy className="size-4" /> Copiar</Button></div>
            )}
          </form>
          <ul className="surface-card divide-y divide-border">
            {d?.convites.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum convite.</li>}
            {d?.convites.map((c: any) => {
              const estado = c.accepted_at ? "Aceito" : c.revoked_at ? "Revogado" : new Date(c.expires_at) < new Date() ? "Expirado" : "Pendente";
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span><span className="block font-medium">{c.name} · {PAPEL_LABEL[c.role as PapelRestaurante] ?? c.role}</span><span className="text-xs text-muted-foreground">{c.email} · {horaBR(c.created_at)}</span></span>
                  <span className="flex items-center gap-2"><StatusBadge tone={estado === "Aceito" ? "success" : estado === "Pendente" ? "info" : "neutral"}>{estado}</StatusBadge>{estado === "Pendente" && <Button size="sm" variant="ghost" onClick={() => mRevogar.mutate(c.id)}>Revogar</Button>}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {aba === "historico" && (
        <ul className="surface-card divide-y divide-border">
          {d?.historico.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Sem alterações registradas.</li>}
          {d?.historico.map((h: any) => (<li key={h.id} className="p-3 text-sm"><span className="font-medium">{h.ator}</span> · {h.action.replaceAll("_", " ")}{h.alvo !== "—" ? ` · ${h.alvo}` : ""}{h.detail ? <span className="text-muted-foreground"> ({h.detail})</span> : null}<span className="block text-xs text-muted-foreground">{horaBR(h.created_at)}</span></li>))}
        </ul>
      )}

      {pessoa && (
        <PainelLateral aberto onFechar={() => setSel(null)} titulo={pessoa.nome} descricao={pessoa.email}>
          <div className="space-y-5">
            {!pessoa.papeis.includes("owner") && (
              <label className="block text-sm"><span className="mb-1 block font-medium">Papel</span>
                <select className={inputCls} value={papelDe(pessoa)} onChange={(e) => mPapel.mutate({ userId: pessoa.userId, role: e.target.value as (typeof PAPEIS)[number] })}>{PAPEIS.map((r) => <option key={r} value={r}>{PAPEL_LABEL[r]}</option>)}</select></label>
            )}
            {pessoa.papeis.includes("owner") ? <p className="text-sm text-muted-foreground">Administrador tem todas as permissões.</p> : (
              <PermissoesPessoa
                papel={papelDe(pessoa) as Exclude<PapelRestaurante, "owner">}
                extras={pessoa.extras}
                removidas={pessoa.removidas}
                salvando={mPerms.isPending}
                onSalvar={(permissoes) => mPerms.mutate({ userId: pessoa.userId, permissoes })}
              />
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => mSusp.mutate({ userId: pessoa.userId, suspenso: !pessoa.suspenso })}>{pessoa.suspenso ? <><Play className="size-4" /> Reativar acesso</> : <><Pause className="size-4" /> Suspender acesso</>}</Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => { if (window.confirm(`Remover ${pessoa.nome} da equipe?`)) mRem.mutate(pessoa.userId); }}><Trash2 className="size-4" /> Remover da equipe</Button>
            </div>
          </div>
        </PainelLateral>
      )}
    </div>
  );
}

const GRUPOS = [...new Set(PERMISSOES.map((p) => p.g))];

/**
 * Poderes de uma pessoa: começa no padrão do papel e o administrador liga ou desliga cada um.
 * O que passa do teto do papel aparece travado (garçom nunca opera caixa). O servidor aplica as mesmas regras.
 */
function PermissoesPessoa({ papel, extras, removidas, salvando, onSalvar }: { papel: Exclude<PapelRestaurante, "owner">; extras: string[]; removidas: string[]; salvando: boolean; onSalvar: (permissoes: string[]) => void }) {
  const atuais = efetivas([papel], { extras, removidas }) as string[];
  const ajustada = extras.length > 0 || removidas.length > 0;
  const alternar = (k: string, ligar: boolean) => onSalvar(ligar ? [...atuais, k] : atuais.filter((x) => x !== k));
  return (
    <fieldset className="space-y-4" disabled={salvando}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">Permissões</p>
        {ajustada && (
          <Button type="button" size="sm" variant="ghost" className="-mt-1 h-7 px-2 text-xs" onClick={() => onSalvar([...PADRAO[papel]])}>
            <RotateCcw className="size-3.5" /> Voltar ao padrão
          </Button>
        )}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Comece pelo padrão do papel e ligue ou desligue cada poder desta pessoa. Vale na hora, no painel e no servidor.
      </p>
      {GRUPOS.map((g) => (
        <div key={g} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
          {PERMISSOES.filter((p) => p.g === g).map((p) => {
            const padrao = (PADRAO[papel] as readonly string[]).includes(p.k);
            const permitido = (TETO[papel] as readonly string[]).includes(p.k);
            const ligado = atuais.includes(p.k);
            const id = `perm-${p.k}`;
            return (
              <div key={p.k} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <label htmlFor={id} className={`min-w-0 text-sm ${permitido ? "" : "text-muted-foreground"}`}>
                  <span className="block">{p.l}</span>
                  {!permitido && <span className="block text-xs">Só para Caixa ou Gerente. Mude o papel para liberar.</span>}
                  {permitido && padrao && !ligado && <span className="block text-xs text-destructive">Removida do padrão</span>}
                  {permitido && !padrao && ligado && <span className="block text-xs text-brand-strong">Adicionada</span>}
                </label>
                <Switch id={id} checked={ligado} disabled={!permitido || salvando} onCheckedChange={(v) => alternar(p.k, v)} aria-label={p.l} />
              </div>
            );
          })}
        </div>
      ))}
    </fieldset>
  );
}
