import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, Aviso, Busca, Esqueleto, Painel, Segmentado, StatusBadge, Tabela, horaBR, inputCls, relativo, usePaginacao, type Tone } from "@/components/tipe/painel/ui";
import { getComunicacao, sendWaReply, updateWaConversation } from "@/lib/tipe/central.functions";
import { CaixaEmail } from "@/components/tipe/central/CaixaEmail";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Props = { aba?: string | undefined; id?: string | undefined; ir: (s: SecaoCentral, aba?: string, id?: string) => void };
const ABAS = [["whatsapp", "WhatsApp"], ["caixa", "Caixa de e-mail"], ["email", "Envios do sistema"], ["modelos", "Modelos"], ["conexoes", "Conexões"]] as const;
const EMAIL_TONE: Record<string, Tone> = { sent: "neutral", delivered: "success", opened: "success", clicked: "success", delivery_delayed: "warning", bounced: "error", complained: "error", failed: "error", suppressed: "warning" };
const EMAIL_LABEL: Record<string, string> = { sent: "Enviado", delivered: "Entregue", opened: "Aberto", clicked: "Clicado", delivery_delayed: "Atrasado", bounced: "Devolvido", complained: "Spam", failed: "Falhou", suppressed: "Suprimido" };

export function Comunicacao({ aba, id, ir }: Props) {
  const atual = ABAS.some(([k]) => k === aba) ? (aba as (typeof ABAS)[number][0]) : "whatsapp";
  const fetchCom = useServerFn(getComunicacao);
  const q = useQuery({ queryKey: ["central-com", atual === "whatsapp" ? id : undefined], queryFn: () => fetchCom({ data: atual === "whatsapp" && id ? { conversaId: id } : {} }), refetchInterval: 30_000 });
  if (q.isPending || !q.data) return <Esqueleto linhas={6} />;
  const d = q.data;
  return (
    <div className="space-y-5">
      <Segmentado label="Canal" value={atual} onChange={(a) => ir("comunicacao", a)} options={ABAS} />
      {atual === "whatsapp" && <WhatsApp d={d} conversaId={id} abrir={(c) => ir("comunicacao", "whatsapp", c)} />}
      {atual === "caixa" && <CaixaEmail />}
      {atual === "email" && <Emails d={d} destaque={id} />}
      {atual === "modelos" && (
        <Painel titulo="Modelos de e-mail" descricao="Registrados no código (src/lib/email-templates). Envio só por ação do sistema ou sua; nunca em massa.">
          <Tabela linhas={d.modelos} chave={(m: any) => m.key} colunas={[{ k: "k", l: "Chave", c: (m: any) => <code className="text-xs">{m.key}</code> }, { k: "n", l: "Nome", c: (m: any) => m.nome }, { k: "a", l: "Assunto", md: true, c: (m: any) => m.assunto }, { k: "f", l: "Destinatário fixo", md: true, c: (m: any) => m.fixo ?? "—" }]} />
        </Painel>
      )}
      {atual === "conexoes" && <Conexoes c={d.config} />}
    </div>
  );
}

type Com = Awaited<ReturnType<typeof getComunicacao>>;

function WhatsApp({ d, conversaId, abrir }: { d: Com; conversaId: string | undefined; abrir: (c: string) => void }) {
  const qc = useQueryClient();
  const inv = () => Promise.all([qc.invalidateQueries({ queryKey: ["central-com"] }), qc.invalidateQueries({ queryKey: ["central-dash"] })]);
  const responder = useServerFn(sendWaReply);
  const atualizar = useServerFn(updateWaConversation);
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState("");
  const mEnviar = useMutation({ mutationFn: () => responder({ data: { conversaId: conversaId!, body: texto } }), onSuccess: () => { setTexto(""); toast.success("Mensagem enviada pela API oficial"); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mStatus = useMutation({ mutationFn: (v: any) => atualizar({ data: v }), onSuccess: () => inv(), onError: (e: Error) => toast.error(e.message) });
  const conv = d.conversas.find((c: any) => c.id === conversaId);
  const lista = d.conversas.filter((c: any) => !filtro || String(c.name ?? "").toLowerCase().includes(filtro.toLowerCase()) || c.phone.includes(filtro));
  const janela = conv?.last_inbound_at && Date.now() - new Date(conv.last_inbound_at).getTime() < 24 * 3600e3;
  return (
    <div className="space-y-4">
      {!d.config.whatsappWebhook && <Aviso tone="warning">WhatsApp oficial ainda não conectado. Quando as credenciais da Meta estiverem configuradas, as conversas aparecem aqui automaticamente. Nenhuma conversa é inventada.</Aviso>}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Painel titulo="Conversas" descricao={`${d.conversas.length} registradas`} semPadding acoes={<Busca value={filtro} onChange={setFiltro} placeholder="Nome ou número" />}>
          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {lista.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa.</li>}
            {lista.map((c: any) => (
              <li key={c.id}>
                <button type="button" onClick={() => abrir(c.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 ${c.id === conversaId ? "bg-muted" : ""}`}>
                  <Avatar nome={c.name ?? c.phone} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{c.name ?? `+${c.phone}`}</span><span className="text-xs text-muted-foreground">{c.last_message_at ? relativo(c.last_message_at) : ""}</span></span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground"><StatusBadge tone={c.status === "open" ? "warning" : c.status === "waiting" ? "info" : "neutral"}>{c.status === "open" ? "Aberta" : c.status === "waiting" ? "Aguardando" : "Resolvida"}</StatusBadge>{c.unread > 0 && <span className="rounded-full bg-highlight px-1.5 font-semibold text-white">{c.unread}</span>}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Painel>
        <Painel titulo={conv ? (conv.name ?? `+${conv.phone}`) : "Selecione uma conversa"} descricao={conv ? `+${conv.phone}${conv.lead_id ? " · ligado a um lead" : ""}` : undefined} semPadding
          acoes={conv && (
            <div className="flex gap-2">
              <select className={`${inputCls} h-9 w-auto`} value={conv.status} onChange={(e) => mStatus.mutate({ id: conv.id, status: e.target.value })} aria-label="Status"><option value="open">Aberta</option><option value="waiting">Aguardando cliente</option><option value="resolved">Resolvida</option></select>
              {conv.unread > 0 && <Button variant="outline" size="sm" onClick={() => mStatus.mutate({ id: conv.id, lida: true })}>Marcar lida</Button>}
            </div>
          )}>
          {conv ? (
            <div className="flex h-[70vh] flex-col">
              <ol className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
                {d.mensagens.map((m: any) => (
                  <li key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.direction === "out" ? "bg-brand-soft" : "bg-white"}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 text-right text-[10px] text-muted-foreground">{horaBR(m.at)}{m.direction === "out" ? ` · ${m.status}` : ""}{m.error ? ` · ${m.error}` : ""}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) mEnviar.mutate(); }}>
                <input className={`${inputCls} h-10 flex-1`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={janela ? "Responder (API oficial da Meta)" : "Fora da janela de 24 h: só modelo aprovado"} disabled={!janela || !d.config.whatsappEnvio} maxLength={4000} />
                <Button type="submit" variant="brand" disabled={!janela || !d.config.whatsappEnvio || mEnviar.isPending} aria-label="Enviar"><Send className="size-4" /></Button>
              </form>
            </div>
          ) : <p className="p-8 text-center text-sm text-muted-foreground">As mensagens da conversa aparecem aqui.</p>}
        </Painel>
      </div>
    </div>
  );
}

function Emails({ d, destaque }: { d: Com; destaque: string | undefined }) {
  const [q, setQ] = useState("");
  const linhas = d.emails.filter((e: any) => !q || e.to_email.includes(q.toLowerCase()) || e.template.includes(q.toLowerCase()));
  const pag = usePaginacao(linhas, 30);
  return (
    <div className="space-y-4">
      {!d.config.resendWebhook && <Aviso tone="neutral">Entregas e aberturas chegam pelo webhook do Resend (RESEND_WEBHOOK_SECRET). Sem ele, o histórico mostra só o envio.</Aviso>}
      <Painel titulo="Histórico de e-mails" descricao={`Enviados pelo sistema via Resend, remetente ${d.config.remetente}. A caixa de entrada fica na aba "Caixa de e-mail".`} semPadding acoes={<Busca value={q} onChange={(v) => { setQ(v); pag.reset(); }} placeholder="E-mail ou modelo" />}>
        <Tabela linhas={pag.fatia} chave={(e: any) => e.id} rodape={pag.controles} vazio="Nenhum e-mail registrado ainda. Os próximos envios aparecem aqui." colunas={[
          { k: "q", l: "Quando", c: (e: any) => <span className={e.id === destaque ? "font-semibold" : ""}>{horaBR(e.created_at)}</span> },
          { k: "p", l: "Para", c: (e: any) => e.to_email },
          { k: "m", l: "Modelo", md: true, c: (e: any) => <code className="text-xs">{e.template}</code> },
          { k: "a", l: "Assunto", md: true, c: (e: any) => e.subject ?? "—" },
          { k: "s", l: "Status", c: (e: any) => <StatusBadge tone={EMAIL_TONE[e.status] ?? "neutral"}>{EMAIL_LABEL[e.status] ?? e.status}</StatusBadge> },
        ]} />
      </Painel>
    </div>
  );
}

function Conexoes({ c }: { c: Com["config"] }) {
  const Item = ({ ok, l, d }: { ok: boolean; l: string; d: string }) => (
    <li className="flex items-start justify-between gap-4 py-3"><div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted-foreground">{d}</p></div><StatusBadge tone={ok ? "success" : "warning"}>{ok ? "Conectado" : "Pendente"}</StatusBadge></li>
  );
  return (
    <Painel titulo="Conexões" descricao="Estado real das integrações. Chaves ficam só nas variáveis do ambiente; nunca no código nem no banco.">
      <ul className="divide-y divide-border">
        <Item ok={c.resendEnvio} l="Resend: envio" d={`Remetente ${c.remetente}. RESEND_API_KEY.`} />
        <Item ok={c.resendWebhook} l="Resend: eventos de entrega" d="Webhook /api/public/resend/webhook assinado (RESEND_WEBHOOK_SECRET)." />
        <Item ok={c.resendRecebimento} l="E-mail: recebimento (Cloudflare)" d="Cloudflare Email Routing + Worker entrega em /api/public/email-inbound (EMAIL_INBOUND_SECRET). Guia: docs/internos/EMAIL-CENTRAL.md." />
        <Item ok={c.whatsappWebhook} l="WhatsApp Cloud API: recebimento" d="Webhook /api/public/whatsapp/webhook (WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN)." />
        <Item ok={c.whatsappEnvio} l="WhatsApp Cloud API: envio" d="WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID da Meta Business." />
      </ul>
    </Painel>
  );
}
