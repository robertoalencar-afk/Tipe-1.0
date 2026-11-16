import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Aviso, Esqueleto, Painel, StatusBadge, Tabela, horaBR, inputCls } from "@/components/tipe/painel/ui";
import { atualizarMembroInterno, criarMembroInterno, listEquipeInterna, novoLinkMembroInterno } from "@/lib/tipe/central-equipe.functions";
import type { PerfilInterno } from "@/lib/tipe/central-perfis";

export function EquipeInterna() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["central-equipe"], queryFn: useServerFn(listEquipeInterna) });
  const criar = useServerFn(criarMembroInterno), atualizar = useServerFn(atualizarMembroInterno), novoLink = useServerFn(novoLinkMembroInterno);
  const [nome, setNome] = useState(""), [email, setEmail] = useState(""), [perfil, setPerfil] = useState<PerfilInterno>("comercial");
  const [link, setLink] = useState<{ para: string; url: string } | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["central-equipe"] });
  const mCriar = useMutation({ mutationFn: () => criar({ data: { nome, email, perfil } }), onSuccess: (r) => { setLink({ para: email, url: r.link }); setNome(""); setEmail(""); toast.success("Conta criada"); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mUpd = useMutation({ mutationFn: (v: { userId: string; perfil?: PerfilInterno; active?: boolean }) => atualizar({ data: v }), onSuccess: () => { toast.success("Atualizado"); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mLink = useMutation({ mutationFn: (m: { userId: string; email: string }) => novoLink({ data: { userId: m.userId } }).then((r) => ({ para: m.email, url: r.link })), onSuccess: setLink, onError: (e: Error) => toast.error(e.message) });
  if (q.isPending || !q.data) return <Esqueleto linhas={4} />;
  const d = q.data;
  return (
    <div className="space-y-4">
      <Aviso tone="neutral">Só você cria contas. Cada pessoa entra com 2FA obrigatório e abre apenas as seções do perfil. Ninguém da equipe interna vê Financeiro, Inteligência, Reserva ou Administração, nem a caixa roberto@. Nenhum e-mail é enviado: você copia o link e entrega à pessoa.</Aviso>
      {link && (
        <Aviso tone="warning">
          <span className="block font-semibold">Link para {link.para} definir a senha (aparece só agora):</span>
          <span className="mt-1 flex items-center gap-2"><input readOnly value={link.url} className={`${inputCls} h-9 flex-1 text-xs`} onFocus={(e) => e.currentTarget.select()} aria-label="Link de acesso" />
            <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(link.url); toast.success("Link copiado"); }}><Copy className="size-4" /> Copiar</Button>
            <Button size="sm" variant="ghost" onClick={() => setLink(null)}>Fechar</Button></span>
        </Aviso>
      )}
      <Painel titulo="Novo membro" descricao="O e-mail não pode já ter conta na Tipe.">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_200px_auto]" onSubmit={(e) => { e.preventDefault(); mCriar.mutate(); }}>
          <label className="text-sm font-medium">Nome<input className={`${inputCls} mt-1 h-10 w-full`} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} required minLength={2} /></label>
          <label className="text-sm font-medium">E-mail<input type="email" className={`${inputCls} mt-1 h-10 w-full`} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required /></label>
          <label className="text-sm font-medium">Perfil<select className={`${inputCls} mt-1 h-10 w-full`} value={perfil} onChange={(e) => setPerfil(e.target.value as PerfilInterno)}>{d.perfis.map((p) => <option key={p.perfil} value={p.perfil}>{p.rotulo}</option>)}</select></label>
          <div className="flex items-end"><Button type="submit" variant="brand" disabled={mCriar.isPending}>Criar conta</Button></div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">{d.perfis.find((p) => p.perfil === perfil)?.descricao}</p>
      </Painel>
      <Painel semPadding titulo="Equipe interna" descricao={`${d.membros.length} cadastrados`}>
        <Tabela linhas={d.membros} chave={(m) => m.user_id} vazio="Ninguém cadastrado ainda." colunas={[
          { k: "n", l: "Nome", c: (m) => <span><span className="font-medium">{m.nome}</span><span className="block text-xs text-muted-foreground">{m.email}</span></span> },
          { k: "p", l: "Perfil", c: (m) => <select className={`${inputCls} h-9`} value={m.perfil} aria-label={`Perfil de ${m.nome}`} onChange={(e) => mUpd.mutate({ userId: m.user_id, perfil: e.target.value as PerfilInterno })}>{d.perfis.map((p) => <option key={p.perfil} value={p.perfil}>{p.rotulo}</option>)}</select> },
          { k: "s", l: "Situação", c: (m) => <StatusBadge tone={m.active ? "success" : "neutral"}>{m.active ? "Ativo" : "Desativado"}</StatusBadge> },
          { k: "c", l: "Criado", md: true, c: (m) => horaBR(m.created_at) },
          { k: "a", l: "Ações", c: (m) => <span className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!m.active} onClick={() => mLink.mutate({ userId: m.user_id, email: m.email })}>Novo link</Button><Button size="sm" variant="outline" onClick={() => mUpd.mutate({ userId: m.user_id, active: !m.active })}>{m.active ? "Desativar" : "Reativar"}</Button></span> },
        ]} />
      </Painel>
    </div>
  );
}
