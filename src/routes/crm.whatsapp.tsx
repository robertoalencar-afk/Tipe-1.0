import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircleAlert, FileText, Plug, Plus, ScrollText, Smartphone, Webhook } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { Btn, dateTimeBR, DemoNote, Field, NoAccessInline, PageHeader, Panel, Pill, Select, TextArea, TextInput } from "@/components/tipe/crm/ui";
import { PLANS } from "@/lib/tipe/crm/permissions";
import { GRAPH_VERSION } from "@/lib/tipe/crm/whatsapp";

export const Route = createFileRoute("/crm/whatsapp")({ component: WhatsApp });

const INSTANCE_STATUS = { demonstracao: { label: "Demonstração", tone: "info" }, aguardando_credenciais: { label: "Aguardando credenciais", tone: "warning" }, conectada: { label: "Conectada", tone: "success" }, erro: { label: "Erro", tone: "danger" } } as const;

function WhatsApp() {
  const { can, run } = useCrm();
  const d = useOrgData();
  const manage = can("whatsapp.manage");
  const [inst, setInst] = useState({ name: "", phone: "" });
  const [tpl, setTpl] = useState({ name: "", category: "UTILITY" as "UTILITY" | "MARKETING" | "AUTHENTICATION", body: "" });
  const limit = d.subscription ? PLANS[d.subscription.planId].limits.whatsappInstances : 0;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tipe.digital";

  return (
    <div className="space-y-4">
      <PageHeader title="WhatsApp" description="Números, modelos de mensagem, webhook e registros da integração oficial com a WhatsApp Business Platform." />
      <DemoNote>A arquitetura usa só a API oficial (Cloud API da Meta). Enquanto as credenciais não forem configuradas no servidor, o atendimento funciona em modo demonstração e nenhuma mensagem real é enviada ou recebida.</DemoNote>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" />Números (instâncias)</span>} description={`${d.waInstances.length} de ${limit} no seu plano`}>
          <ul className="divide-y divide-border">
            {d.waInstances.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 py-2.5 text-xs first:pt-0">
                <span className="min-w-0"><span className="block truncate font-medium">{w.name}</span><span className="text-muted-foreground">{w.phone} · {w.provider === "demo" ? "simulador" : "Cloud API"}</span></span>
                <Pill tone={INSTANCE_STATUS[w.status].tone}>{INSTANCE_STATUS[w.status].label}</Pill>
              </li>
            ))}
          </ul>
          {manage ? (
            <form className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (run({ type: "createWaInstance", ...inst }, "Número registrado. Falta configurar as credenciais no servidor.").ok) setInst({ name: "", phone: "" }); }}>
              <TextInput aria-label="Nome do número" placeholder="Nome (ex.: Vendas)" value={inst.name} onChange={(e) => setInst({ ...inst, name: e.target.value })} />
              <TextInput aria-label="Número com país e DDD" placeholder="+55 85 90000-0000" value={inst.phone} onChange={(e) => setInst({ ...inst, phone: e.target.value })} />
              <Btn type="submit"><Plus className="h-4 w-4" />Adicionar</Btn>
            </form>
          ) : <NoAccessInline text="Só administradores gerenciam números e modelos." />}
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" />Webhook e credenciais</span>} description="Configuração no painel da Meta (App → WhatsApp → Configuração)">
          <dl className="space-y-2.5 text-xs">
            <div><dt className="text-[0.65rem] text-muted-foreground">URL de retorno</dt><dd><code className="break-all rounded bg-muted px-1.5 py-0.5">{origin}/api/public/whatsapp/webhook</code></dd></div>
            <div><dt className="text-[0.65rem] text-muted-foreground">Campos assinados</dt><dd>messages (mensagens recebidas e status de entrega)</dd></div>
            <div><dt className="text-[0.65rem] text-muted-foreground">Segredos no servidor (nunca no navegador)</dt><dd className="flex flex-wrap gap-1">{["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"].map((k) => <code key={k} className="rounded bg-muted px-1.5 py-0.5">{k}</code>)}</dd></div>
            <div><dt className="text-[0.65rem] text-muted-foreground">Segurança</dt><dd>Verificação do hub.challenge, assinatura X-Hub-Signature-256 conferida em tempo constante, Graph API {GRAPH_VERSION}. Sem credenciais o webhook responde 503 e não processa nada.</dd></div>
            <div><dt className="text-[0.65rem] text-muted-foreground">Status de entrega</dt><dd className="flex flex-wrap gap-1"><Pill>Enviada</Pill><Pill tone="primary">Entregue</Pill><Pill tone="success">Lida</Pill><Pill tone="danger">Falhou</Pill></dd></div>
            <div><dt className="text-[0.65rem] text-muted-foreground">Permissões</dt><dd>Proprietário e administrador configuram; gestores, vendedores e atendentes respondem pela caixa de entrada; somente leitura não envia.</dd></div>
          </dl>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Modelos de mensagem</span>} description="Fora da janela de 24 horas, a Meta só aceita modelos aprovados">
          <ul className="divide-y divide-border">
            {d.waTemplates.map((t) => (
              <li key={t.id} className="py-2.5 text-xs first:pt-0">
                <div className="flex items-center justify-between gap-2"><code className="font-semibold">{t.name}</code><span className="flex gap-1"><Pill>{t.category}</Pill><Pill tone={t.status === "aprovado" ? "success" : t.status === "pendente" ? "warning" : "danger"}>{t.status === "aprovado" ? "Aprovado" : t.status === "pendente" ? "Em análise" : "Rejeitado"}</Pill></span></div>
                <p className="mt-1 text-muted-foreground">{t.body}</p>
              </li>
            ))}
          </ul>
          {manage && (
            <form className="mt-3 space-y-2 border-t border-border pt-3" onSubmit={(e) => { e.preventDefault(); if (run({ type: "createWaTemplate", ...tpl }, "Modelo registrado como em análise").ok) setTpl({ name: "", category: "UTILITY", body: "" }); }}>
              <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                <Field label="Nome do modelo" hint="Minúsculas e _">{(id, dd) => <TextInput id={id} aria-describedby={dd} value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} placeholder="retorno_proposta" />}</Field>
                <Field label="Categoria">{(id) => <Select id={id} value={tpl.category} onChange={(e) => setTpl({ ...tpl, category: e.target.value as typeof tpl.category })}><option value="UTILITY">Utilidade</option><option value="MARKETING">Marketing</option><option value="AUTHENTICATION">Autenticação</option></Select>}</Field>
              </div>
              <Field label="Texto" hint="Use {{1}}, {{2}} para variáveis">{(id, dd) => <TextArea id={id} aria-describedby={dd} value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} />}</Field>
              <div className="flex justify-end"><Btn type="submit"><Plus className="h-4 w-4" />Registrar modelo</Btn></div>
            </form>
          )}
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" />Registros</span>} description="Últimos eventos de webhook e envios" bodyClassName="p-0">
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {d.waLogs.slice(0, 40).map((l) => (
              <li key={l.id} className="flex items-start gap-2 px-4 py-2 text-xs">
                {l.status === "erro" ? <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /> : <Plug className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1"><span className="block">{l.detail}</span><span className="text-[0.65rem] text-muted-foreground">{l.direction === "webhook" ? "Webhook" : "Envio"} · {l.event} · {dateTimeBR(l.at)}</span></span>
                <Pill tone={l.status === "erro" ? "danger" : l.status === "ok" ? "success" : "info"}>{l.status}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
