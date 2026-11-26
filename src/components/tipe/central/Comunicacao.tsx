import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Aviso, Busca, Esqueleto, Painel, Segmentado, StatusBadge, Tabela, horaBR, usePaginacao, type Tone } from "@/components/tipe/painel/ui";
import { getComunicacao } from "@/lib/tipe/central.functions";
import { WhatsAppLeads } from "@/components/tipe/central/WhatsAppLeads";
import { CaixaEmail } from "@/components/tipe/central/CaixaEmail";
import { getAcessoCentral } from "@/lib/tipe/central-equipe.functions";
import { temWhatsapp } from "@/lib/tipe/central-perfis";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Props = { aba?: string | undefined; id?: string | undefined; ir: (s: SecaoCentral, aba?: string, id?: string) => void };
const ABAS = [["caixa", "Caixa de e-mail"], ["email", "Envios do sistema"], ["modelos", "Modelos"], ["conexoes", "Conexões"]] as const;
const EMAIL_TONE: Record<string, Tone> = { sent: "neutral", delivered: "success", opened: "success", clicked: "success", delivery_delayed: "warning", bounced: "error", complained: "error", failed: "error", suppressed: "warning" };
const EMAIL_LABEL: Record<string, string> = { sent: "Enviado", delivered: "Entregue", opened: "Aberto", clicked: "Clicado", delivery_delayed: "Atrasado", bounced: "Devolvido", complained: "Spam", failed: "Falhou", suppressed: "Suprimido" };

export function Comunicacao({ aba, id, ir }: Props) {
  const acesso = useQuery({ queryKey: ["central-acesso"], queryFn: useServerFn(getAcessoCentral), staleTime: 60_000 });
  const fundador = acesso.data?.papel === "founder";
  // Links antigos (?s=comunicacao&aba=whatsapp) agora abrem a seção própria do WhatsApp.
  useEffect(() => { if (aba === "whatsapp") ir("whatsapp", "conversas", id); }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps
  // Equipe interna: só a caixa de e-mail. Histórico, modelos e conexões são do fundador.
  const abas = ABAS.filter(([k]) => fundador || k === "caixa");
  const atual = abas.some(([k]) => k === aba) ? (aba as (typeof ABAS)[number][0]) : (abas[0]?.[0] ?? "caixa");
  const fetchCom = useServerFn(getComunicacao);
  const q = useQuery({ queryKey: ["central-com", "email"], queryFn: () => fetchCom({ data: {} }), refetchInterval: 60_000, enabled: atual !== "caixa" });
  if (atual === "caixa") return (
    <div className="space-y-5">
      {abas.length > 1 && <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0"><Segmentado className="whitespace-nowrap" label="E-mail" value={atual} onChange={(a) => ir("comunicacao", a)} options={abas} /></div>}
      <CaixaEmail />
    </div>
  );
  if (q.isPending || !q.data) return <Esqueleto linhas={6} />;
  const d = q.data;
  return (
    <div className="space-y-5">
      <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0"><Segmentado className="whitespace-nowrap" label="E-mail" value={atual} onChange={(a) => ir("comunicacao", a)} options={abas} /></div>
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

/** Seção WhatsApp da Central: conversas do número comercial, com a Lebre atendendo. */
export function WhatsAppCentral({ id, ir }: Props) {
  const acesso = useQuery({ queryKey: ["central-acesso"], queryFn: useServerFn(getAcessoCentral), staleTime: 60_000 });
  const fundador = acesso.data?.papel === "founder";
  const perfil = acesso.data?.perfil ?? null;
  const pode = fundador || (perfil !== null && temWhatsapp(perfil));
  const fetchCom = useServerFn(getComunicacao);
  const q = useQuery({ queryKey: ["central-com", "wa", id], queryFn: () => fetchCom({ data: id ? { conversaId: id } : {} }), refetchInterval: 15_000, enabled: pode });
  if (acesso.data && !pode) return <Aviso tone="neutral">Seu setor não atende o WhatsApp comercial.</Aviso>;
  if (q.isPending || !q.data) return <Esqueleto linhas={6} />;
  return <WhatsAppLeads d={q.data} conversaId={id} fundador={fundador} abrir={(c) => ir("whatsapp", "conversas", c)} abrirLead={(leadId) => ir("comercial", "leads", leadId)} />;
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
