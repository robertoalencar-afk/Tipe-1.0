import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Archive, ArrowLeft, Ban, Forward, Inbox, Mail, Paperclip, Pencil, Reply, Send, Star, Trash2, FileText, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Aviso, Avatar, Busca, Esqueleto, horaBR, inputCls, relativo } from "@/components/tipe/painel/ui";
import { deleteMailForever, getMailOverview, getMailThread, listMail, saveMailDraft, saveMailSignature, sendMail, updateMail } from "@/lib/tipe/central-email.functions";
import { PASTA_LABEL, assinaturaHtml, assuntoEncaminhar, assuntoResposta, citar, type Pasta } from "@/lib/tipe/mail";

const ICONE: Record<Pasta, typeof Inbox> = { inbox: Inbox, sent: Send, drafts: FileText, spam: Ban, trash: Trash2, archive: Archive };
const ORDEM: Pasta[] = ["inbox", "sent", "drafts", "archive", "spam", "trash"];
type Rascunho = { id?: string; para: string; cc: string; assunto: string; texto: string; respondeId?: string };

export function CaixaEmail() {
  const qc = useQueryClient();
  const fOverview = useServerFn(getMailOverview), fLista = useServerFn(listMail), fThread = useServerFn(getMailThread), fUpd = useServerFn(updateMail), fDel = useServerFn(deleteMailForever), fSend = useServerFn(sendMail), fDraft = useServerFn(saveMailDraft), fSig = useServerFn(saveMailSignature);
  const [caixa, setCaixa] = useState<string | null>(null);
  const [pasta, setPasta] = useState<Pasta>("inbox");
  const [busca, setBusca] = useState("");
  const [estrela, setEstrela] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [escrevendo, setEscrevendo] = useState<Rascunho | null>(null);
  const [assinando, setAssinando] = useState<string | null>(null);

  const ov = useQuery({ queryKey: ["mail-ov"], queryFn: () => fOverview(), refetchInterval: 30_000 });
  useEffect(() => { if (!caixa && ov.data?.caixas[0]) setCaixa(ov.data.caixas[0].address); }, [ov.data, caixa]);
  const lista = useQuery({ queryKey: ["mail-list", caixa, pasta, busca, estrela], enabled: Boolean(caixa), refetchInterval: 30_000, queryFn: () => fLista({ data: { caixa: caixa!, pasta, ...(busca ? { busca } : {}), ...(estrela ? { estrela: true } : {}), pagina: 0 } }) });
  const conversa = useQuery({ queryKey: ["mail-thread", aberto], enabled: Boolean(aberto), queryFn: () => fThread({ data: { id: aberto! } }) });
  const inv = () => Promise.all([qc.invalidateQueries({ queryKey: ["mail-ov"] }), qc.invalidateQueries({ queryKey: ["mail-list"] }), qc.invalidateQueries({ queryKey: ["mail-thread"] })]);
  const mUpd = useMutation({ mutationFn: (v: { ids: string[]; pasta?: Pasta; lida?: boolean; estrela?: boolean }) => fUpd({ data: v }), onSuccess: inv, onError: (e: Error) => toast.error(e.message) });
  const mDel = useMutation({ mutationFn: (ids: string[]) => fDel({ data: { ids } }), onSuccess: () => { setAberto(null); toast.success("Excluído para sempre"); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mSend = useMutation({ mutationFn: (r: Rascunho) => fSend({ data: { caixa: caixa!, para: r.para, cc: r.cc, assunto: r.assunto, texto: r.texto, ...(r.respondeId ? { respondeId: r.respondeId } : {}), ...(r.id ? { rascunhoId: r.id } : {}) } }), onSuccess: () => { toast.success("E-mail enviado"); setEscrevendo(null); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mDraft = useMutation({ mutationFn: (r: Rascunho) => fDraft({ data: { caixa: caixa!, para: r.para, cc: r.cc, assunto: r.assunto, texto: r.texto, ...(r.id ? { rascunhoId: r.id } : {}) } }), onSuccess: () => { toast.success("Rascunho salvo"); setEscrevendo(null); inv(); }, onError: (e: Error) => toast.error(e.message) });

  const mSig = useMutation({ mutationFn: (v: { caixa: string; assinatura: string }) => fSig({ data: v }), onSuccess: () => { toast.success("Assinatura salva"); setAssinando(null); inv(); }, onError: (e: Error) => toast.error(e.message) });

  if (ov.isPending || !ov.data) return <Esqueleto linhas={6} />;
  const o = ov.data, cx = o.caixas.find((c) => c.address === caixa);
  const nao = (p: Pasta) => o.naoLidas[`${caixa}|${p}`] ?? 0;
  const itens = lista.data?.itens ?? [];
  const msgs = conversa.data?.mensagens ?? [];

  function responder(m: any, todos = false) {
    const para = m.direction === "out" ? (m.to_addrs ?? []).map((a: any) => a.email).join(", ") : m.from_addr;
    const cc = todos ? (m.cc_addrs ?? []).map((a: any) => a.email).filter((e: string) => e !== caixa).join(", ") : "";
    setEscrevendo({ para, cc, assunto: assuntoResposta(m.subject), texto: citar(m.from_name || m.from_addr, new Date(m.at), m.text_body ?? ""), respondeId: m.id });
  }
  const encaminhar = (m: any) => setEscrevendo({ para: "", cc: "", assunto: assuntoEncaminhar(m.subject), texto: `\n\n---------- Mensagem encaminhada ----------\nDe: ${m.from_name ? `${m.from_name} <${m.from_addr}>` : m.from_addr}\nAssunto: ${m.subject}\n\n${m.text_body ?? ""}` });
  const abrirItem = (it: any) => {
    if (it.folder === "drafts") { setEscrevendo({ id: it.id, para: (it.to_addrs ?? []).map((a: any) => a.email).join(", "), cc: "", assunto: it.subject, texto: it.snippet ?? "" }); return; }
    setAberto(it.id);
  };

  return (
    <div className="space-y-3">
      {o.recebimento === "sem_segredo" && <Aviso tone="warning">Recebimento sem segredo: o segredo EMAIL_INBOUND_SECRET sai na próxima publicação do site. Depois falta ligar o Email Routing no Cloudflare (docs/internos/EMAIL-CENTRAL.md).</Aviso>}
      {o.recebimento === "aguardando" && <Aviso tone="neutral">Recebimento pronto no servidor, aguardando o primeiro e-mail. Falta ligar o Cloudflare Email Routing para roberto@ e contato@ (passos 3 e 4 do guia); até lá, o recebimento continua no provedor atual.</Aviso>}
      {!o.envio && <Aviso tone="warning">Envio desligado: falta RESEND_API_KEY.</Aviso>}
      <div className="grid gap-3 lg:grid-cols-[220px_340px_1fr]">
        <nav aria-label="Pastas" className={`${aberto ? "hidden lg:block" : ""} space-y-3 rounded-xl border border-border bg-card p-3`}>
          <Button variant="brand" className="w-full" onClick={() => setEscrevendo({ para: "", cc: "", assunto: "", texto: "" })}><Pencil className="size-4" /> Escrever</Button>
          <select className={`${inputCls} h-9 w-full`} value={caixa ?? ""} onChange={(e) => { setCaixa(e.target.value); setAberto(null); }} aria-label="Caixa">
            {o.caixas.map((c) => <option key={c.address} value={c.address}>{c.address}</option>)}
          </select>
          <ul className="space-y-0.5">
            {ORDEM.map((p) => { const I = ICONE[p]; const n = nao(p); return (
              <li key={p}><button type="button" onClick={() => { setPasta(p); setAberto(null); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted ${pasta === p ? "bg-muted font-semibold" : ""}`}><I className="size-4" />{PASTA_LABEL[p]}{n > 0 && <span className="ml-auto rounded-full bg-highlight px-1.5 text-xs font-semibold text-white">{n}</span>}</button></li>
            ); })}
          </ul>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setAssinando(cx?.signature ?? "")}>Assinatura</Button>
          <label className="flex items-center gap-2 px-3 text-xs text-muted-foreground"><input type="checkbox" checked={estrela} onChange={(e) => setEstrela(e.target.checked)} /> Só com estrela</label>
        </nav>

        <section aria-label="Mensagens" className={`${aberto ? "hidden lg:block" : ""} overflow-hidden rounded-xl border border-border bg-card`}>
          <div className="border-b border-border p-3"><Busca value={busca} onChange={setBusca} placeholder="Buscar assunto ou remetente" /></div>
          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {lista.isPending && <li className="p-6 text-center text-sm text-muted-foreground">Carregando…</li>}
            {!lista.isPending && itens.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">{busca ? "Nada encontrado para essa busca." : `${PASTA_LABEL[pasta]} vazia.`}</li>}
            {itens.map((it: any) => {
              const quem = it.direction === "out" ? `Para: ${(it.to_addrs ?? []).map((a: any) => a.nome || a.email).join(", ") || "(sem destinatário)"}` : it.from_name || it.from_addr;
              return (
                <li key={it.id}>
                  <button type="button" onClick={() => abrirItem(it)} className={`flex w-full gap-3 px-3 py-3 text-left hover:bg-muted/60 ${aberto === it.id ? "bg-muted" : ""}`}>
                    <Avatar nome={String(it.from_name || it.from_addr)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className={`truncate text-sm ${it.is_read ? "" : "font-bold"}`}>{quem}</span><span className="shrink-0 text-xs text-muted-foreground">{relativo(it.at)}</span></span>
                      <span className={`block truncate text-sm ${it.is_read ? "text-muted-foreground" : "font-semibold"}`}>{it.subject || "(sem assunto)"}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">{it.starred && <Star className="size-3 fill-current text-amber-500" />}{(it.attachments?.length ?? 0) > 0 && <Paperclip className="size-3" />}{it.snippet}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Leitura" className={`${aberto ? "" : "hidden lg:block"} rounded-xl border border-border bg-card`}>
          {!aberto || !conversa.data ? (
            <div className="flex h-full min-h-60 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground"><Mail className="size-8" />{aberto ? "Abrindo…" : "Selecione uma mensagem para ler."}</div>
          ) : (
            <div className="flex max-h-[78vh] flex-col">
              <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setAberto(null)}><ArrowLeft className="size-4" /> Voltar</Button>
                <h2 className="min-w-0 flex-1 truncate font-display text-base font-bold">{msgs[0]?.subject || "(sem assunto)"}</h2>
                {conversa.data.lead && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs">Lead: {conversa.data.lead.name ?? "sem nome"}</span>}
                {pasta === "trash" ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { mUpd.mutate({ ids: msgs.map((m: any) => m.id), pasta: "inbox" }); setAberto(null); }}><Undo2 className="size-4" /> Restaurar</Button>
                    <Button variant="outline" size="sm" onClick={() => mDel.mutate(msgs.map((m: any) => m.id))}>Excluir para sempre</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" aria-label="Arquivar" title="Arquivar" onClick={() => { mUpd.mutate({ ids: msgs.map((m: any) => m.id), pasta: "archive" }); setAberto(null); }}><Archive className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label={pasta === "spam" ? "Não é spam" : "Marcar como spam"} title={pasta === "spam" ? "Não é spam" : "Spam"} onClick={() => { mUpd.mutate({ ids: msgs.map((m: any) => m.id), pasta: pasta === "spam" ? "inbox" : "spam" }); setAberto(null); }}><Ban className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Mover para a lixeira" title="Lixeira" onClick={() => { mUpd.mutate({ ids: msgs.map((m: any) => m.id), pasta: "trash" }); setAberto(null); }}><Trash2 className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Marcar como não lida" title="Não lida" onClick={() => { mUpd.mutate({ ids: msgs.map((m: any) => m.id), lida: false }); setAberto(null); }}><Mail className="size-4" /></Button>
                  </>
                )}
              </div>
              <ol className="flex-1 space-y-4 overflow-y-auto p-4">
                {msgs.map((m: any) => (
                  <li key={m.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{m.from_name ? `${m.from_name} ` : ""}<span className="font-normal text-muted-foreground">&lt;{m.from_addr}&gt;</span></p><p className="truncate text-xs text-muted-foreground">Para: {(m.to_addrs ?? []).map((a: any) => a.email).join(", ")} · {horaBR(m.at)}</p></div>
                      <button type="button" aria-label={m.starred ? "Tirar estrela" : "Marcar com estrela"} onClick={() => mUpd.mutate({ ids: [m.id], estrela: !m.starred })}><Star className={`size-4 ${m.starred ? "fill-current text-amber-500" : "text-muted-foreground"}`} /></button>
                    </div>
                    {/* Sempre texto puro: nunca renderizamos HTML de terceiros na Central. */}
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm">{m.text_body || "(mensagem sem texto)"}</p>
                    {(m.attachments?.length ?? 0) > 0 && <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Paperclip className="size-3" />{m.attachments.map((a: any, i: number) => <span key={i} className="rounded bg-muted px-2 py-0.5">{a.filename ?? "anexo"}</span>)} (anexos não são guardados)</p>}
                    <div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={() => responder(m)}><Reply className="size-4" /> Responder</Button><Button variant="outline" size="sm" onClick={() => responder(m, true)}>Responder a todos</Button><Button variant="outline" size="sm" onClick={() => encaminhar(m)}><Forward className="size-4" /> Encaminhar</Button></div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>

      {assinando !== null && (
        <div role="dialog" aria-modal="true" aria-label="Assinatura" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <form className="flex max-h-[92vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl" onSubmit={(e) => { e.preventDefault(); mSig.mutate({ caixa: caixa!, assinatura: assinando }); }}>
            <h2 className="font-display text-lg font-bold">Assinatura de {cx?.address}</h2>
            <label className="text-sm font-medium">Texto<textarea className={`${inputCls} mt-1 min-h-28 w-full py-2`} value={assinando} onChange={(e) => setAssinando(e.target.value)} maxLength={600} /></label>
            <p className="text-xs text-muted-foreground">1ª linha: nome. 2ª: cargo. Demais: contatos. E-mails e tipe.digital viram link.</p>
            <div className="rounded-xl border border-border bg-white p-4" aria-label="Prévia"><div dangerouslySetInnerHTML={{ __html: assinaturaHtml(assinando) || "<em style='color:#575b5f;font-size:13px'>Sem assinatura</em>" }} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAssinando(null)}>Cancelar</Button><Button type="submit" variant="brand" disabled={mSig.isPending}>Salvar</Button></div>
          </form>
        </div>
      )}
      {escrevendo && (
        <div role="dialog" aria-modal="true" aria-label="Nova mensagem" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <form className="flex max-h-[92vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl"
            onSubmit={(e) => { e.preventDefault(); mSend.mutate(escrevendo); }}>
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Nova mensagem</h2><button type="button" onClick={() => setEscrevendo(null)} className="text-sm text-muted-foreground underline">Fechar</button></div>
            <p className="text-xs text-muted-foreground">De: <strong>{cx?.address}</strong></p>
            <label className="text-sm font-medium">Para<input className={`${inputCls} mt-1 h-10 w-full`} value={escrevendo.para} onChange={(e) => setEscrevendo({ ...escrevendo, para: e.target.value })} placeholder="nome@exemplo.com, outro@exemplo.com" /></label>
            <label className="text-sm font-medium">Cc<input className={`${inputCls} mt-1 h-10 w-full`} value={escrevendo.cc} onChange={(e) => setEscrevendo({ ...escrevendo, cc: e.target.value })} /></label>
            <label className="text-sm font-medium">Assunto<input className={`${inputCls} mt-1 h-10 w-full`} value={escrevendo.assunto} onChange={(e) => setEscrevendo({ ...escrevendo, assunto: e.target.value })} maxLength={300} /></label>
            <label className="text-sm font-medium">Mensagem<textarea className={`${inputCls} mt-1 min-h-52 w-full py-2`} value={escrevendo.texto} onChange={(e) => setEscrevendo({ ...escrevendo, texto: e.target.value })} /></label>
            {cx?.signature && <p className="text-xs text-muted-foreground">A assinatura de {cx.address} é adicionada ao enviar.</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={mDraft.isPending} onClick={() => mDraft.mutate(escrevendo)}>Salvar rascunho</Button>
              <Button type="submit" variant="brand" disabled={mSend.isPending || !o.envio || !escrevendo.para.trim() || !escrevendo.assunto.trim() || !escrevendo.texto.trim()}><Send className="size-4" /> Enviar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
