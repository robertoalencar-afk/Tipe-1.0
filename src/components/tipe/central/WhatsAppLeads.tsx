import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  CalendarCheck,
  Copy,
  Flame,
  Hand,
  Inbox,
  Link2,
  MessageCircle,
  Send,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Avatar,
  Aviso,
  Busca,
  Campo,
  Kpi,
  Painel,
  Segmentado,
  StatusBadge,
  horaBR,
  inputCls,
  relativo,
  type Tone,
} from "@/components/tipe/painel/ui";
import {
  criarLeadWa,
  sendWaReply,
  setWaLebre,
  updateWaConversation,
  type getComunicacao,
} from "@/lib/tipe/central.functions";
import {
  ENTRADAS,
  MODELOS_META,
  NUMERO_COMERCIAL,
  linkEntrada,
} from "@/lib/tipe/crm/lebre-whatsapp";

type Com = Awaited<ReturnType<typeof getComunicacao>>;
type Conv = Com["conversas"][number] & Record<string, any>;
type Filtro = "todas" | "voce" | "lebre" | "quentes" | "demos" | "resolvidas";

const TEMP: Record<string, { l: string; tone: Tone }> = {
  quente: { l: "Quente", tone: "error" },
  morno: { l: "Morno", tone: "warning" },
  frio: { l: "Frio", tone: "neutral" },
};
const ETAPAS = [
  ["novo", "Novo contato"],
  ["qualificando", "Qualificando"],
  ["qualificado", "Qualificado"],
  ["demo", "Demonstração"],
  ["cliente", "Cliente"],
  ["perdido", "Sem interesse"],
] as const;
const ORIGEM: Record<string, string> = {
  site: "Site",
  instagram: "Instagram",
  qr: "QR impresso",
  indicacao: "Indicação",
  prospeccao: "Prospecção",
};
const CAMPOS_FICHA: [string, string][] = [
  ["nome", "Nome"],
  ["restaurante", "Restaurante"],
  ["tipo", "Tipo de casa"],
  ["cidade", "Cidade"],
  ["bairro", "Bairro"],
  ["mesas", "Mesas"],
  ["pdv", "PDV"],
  ["dor", "Maior dor"],
  ["interesse", "Interesse"],
  ["demo", "Demonstração"],
  ["email", "E-mail"],
];

/** Respostas prontas da equipe, escritas como gente escreve. O texto vai para a caixa e pode ser editado. */
const RAPIDAS = [
  {
    l: "Confirmar demo",
    t: "Perfeito! Fica confirmada nossa conversa para {horário}. Te mando o link da videochamada por aqui alguns minutos antes. Qualquer imprevisto, é só me avisar.",
  },
  {
    l: "Simulador",
    t: "Se quiser ver como fica para o seu cliente, dá para testar agora pelo celular: tipe.digital/simulador. Depois me conta o que achou.",
  },
  { l: "Pedir e-mail", t: "Qual o melhor e-mail para eu te enviar o convite da demonstração?" },
  {
    l: "Planos",
    t: "Os planos são por número de mesas, sem taxa da Tipe por transação: Essencial R$ 79, Profissional R$ 119 e Premium R$ 179 por mês. Quantas mesas tem a casa hoje?",
  },
  {
    l: "Retomar",
    t: "Oi! Passando para saber se ficou alguma dúvida. Se fizer sentido, separo 20 minutos para te mostrar a Tipe funcionando no seu salão.",
  },
];

const janelaAberta = (c: Conv | undefined) =>
  Boolean(c?.last_inbound_at && Date.now() - new Date(c.last_inbound_at).getTime() < 24 * 3600e3);
const telefone = (p: string) => {
  const n = p.startsWith("55") ? p.slice(2) : p;
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `+${p}`;
};
const copiar = (t: string, ok = "Copiado") =>
  navigator.clipboard.writeText(t).then(
    () => toast.success(ok),
    () => toast.error("Não foi possível copiar"),
  );

export function WhatsAppLeads({
  d,
  conversaId,
  abrir,
  fundador,
  abrirLead,
}: {
  d: Com;
  conversaId: string | undefined;
  abrir: (c: string | undefined) => void;
  fundador: boolean;
  abrirLead: (id: string) => void;
}) {
  const qc = useQueryClient();
  const inv = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["central-com"] }),
      qc.invalidateQueries({ queryKey: ["central-dash"] }),
    ]);
  const conversas = d.conversas as Conv[];
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const lebreGeral = d.lebre.ativa;
  const ligar = useServerFn(setWaLebre);
  const mLebre = useMutation({
    mutationFn: (ativa: boolean) => ligar({ data: { ativa } }),
    onSuccess: (_r, ativa) => {
      toast.success(ativa ? "A Lebre voltou a atender" : "Atendimento automático pausado");
      inv();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const n = useMemo(() => {
    const semana = Date.now() - 7 * 864e5;
    const novas = conversas.filter((c) => new Date(c.created_at).getTime() > semana);
    const tempos = conversas
      .filter((c) => c.primeira_resposta_at && c.created_at)
      .map(
        (c) =>
          (new Date(c.primeira_resposta_at).getTime() - new Date(c.created_at).getTime()) / 1000,
      )
      .filter((s) => s >= 0)
      .sort((a, b) => a - b);
    return {
      novas: novas.length,
      voce: conversas.filter((c) => c.precisa_humano && c.status !== "resolved").length,
      lebre: conversas.filter((c) => c.lebre_ativa && !c.optout && c.status !== "resolved").length,
      quentes: conversas.filter((c) => c.temperatura === "quente" && c.status !== "resolved")
        .length,
      demos: conversas.filter((c) => c.etapa === "demo").length,
      resolvidas: conversas.filter((c) => c.status === "resolved").length,
      leads: novas.filter((c) => c.lead_id).length,
      mediana: tempos.length ? tempos[Math.floor(tempos.length / 2)]! : null,
    };
  }, [conversas]);

  const lista = conversas
    .filter((c) => {
      if (filtro === "voce") return c.precisa_humano && c.status !== "resolved";
      if (filtro === "lebre") return c.lebre_ativa && !c.optout && c.status !== "resolved";
      if (filtro === "quentes") return c.temperatura === "quente" && c.status !== "resolved";
      if (filtro === "demos") return c.etapa === "demo";
      if (filtro === "resolvidas") return c.status === "resolved";
      return true;
    })
    .filter((c) => {
      if (!busca) return true;
      const b = busca.toLowerCase();
      return (
        String(c.name ?? "")
          .toLowerCase()
          .includes(b) ||
        String(c.ficha?.restaurante ?? "")
          .toLowerCase()
          .includes(b) ||
        c.phone.includes(busca.replace(/\D/g, "") || "§")
      );
    })
    .sort(
      (a, b) =>
        Number(b.precisa_humano && b.status !== "resolved") -
          Number(a.precisa_humano && a.status !== "resolved") ||
        String(b.last_message_at ?? "").localeCompare(String(a.last_message_at ?? "")),
    );

  const conv = conversas.find((c) => c.id === conversaId);
  const tempo =
    n.mediana === null
      ? "—"
      : n.mediana < 60
        ? `${Math.round(n.mediana)} s`
        : n.mediana < 3600
          ? `${Math.round(n.mediana / 60)} min`
          : `${Math.round(n.mediana / 3600)} h`;

  return (
    <div className="space-y-5">
      {!d.config.whatsappWebhook && (
        <Aviso tone="warning">
          O número {telefone(NUMERO_COMERCIAL)} ainda não está ligado à Central. Assim que as
          credenciais da Meta estiverem no ambiente de produção, as conversas aparecem aqui. Nenhuma
          conversa é inventada.
        </Aviso>
      )}

      <section className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <img
            src="/marca/lebre-esperando.webp"
            alt=""
            className="size-12 shrink-0 rounded-full bg-brand-soft object-cover"
          />
          <div>
            <p className="font-semibold">
              {lebreGeral
                ? "A Lebre está atendendo o WhatsApp 24 horas"
                : "Atendimento automático pausado"}
            </p>
            <p className="text-sm text-muted-foreground">
              {lebreGeral
                ? "Ela responde quem escreve, entende a casa, oferece a demonstração e passa para você quando precisa de uma pessoa. Nunca inicia conversa e respeita quem pede para sair."
                : "Todas as mensagens novas vão para a fila da equipe."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:shrink-0">
          <span className="text-sm text-muted-foreground">{telefone(NUMERO_COMERCIAL)}</span>
          {fundador && (
            <Switch
              checked={lebreGeral}
              disabled={mLebre.isPending}
              onCheckedChange={(v) => mLebre.mutate(v)}
              aria-label="Lebre atende o WhatsApp"
            />
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Precisam de você"
          value={n.voce}
          icon={Hand}
          tone={n.voce ? "warning" : undefined}
          onClick={() => setFiltro("voce")}
          hint="Conversas na fila da equipe"
        />
        <Kpi
          label="Novas (7 dias)"
          value={n.novas}
          icon={Inbox}
          hint={`${n.leads} viraram lead`}
          onClick={() => setFiltro("todas")}
        />
        <Kpi
          label="Leads quentes"
          value={n.quentes}
          icon={Flame}
          tone={n.quentes ? "brand" : undefined}
          onClick={() => setFiltro("quentes")}
          hint="Prontos para a demonstração"
        />
        <Kpi
          label="Demonstrações pedidas"
          value={n.demos}
          icon={CalendarCheck}
          onClick={() => setFiltro("demos")}
          hint="Confirme o horário por aqui"
        />
        <Kpi
          label="Primeira resposta"
          value={tempo}
          icon={Timer}
          hint="Tempo mediano"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <Segmentado
          className="whitespace-nowrap"
          label="Filtro de conversas"
          value={filtro}
          onChange={setFiltro}
          options={[
            ["todas", `Todas (${conversas.length})`],
            ["voce", `Precisam de você (${n.voce})`],
            ["lebre", `Com a Lebre (${n.lebre})`],
            ["quentes", `Quentes (${n.quentes})`],
            ["demos", `Demonstrações (${n.demos})`],
            ["resolvidas", `Resolvidas (${n.resolvidas})`],
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px]">
        <Painel
          titulo="Conversas"
          descricao={`${lista.length} nesta visão`}
          semPadding
          className={conv ? "hidden lg:block" : ""}
          acoes={<Busca value={busca} onChange={setBusca} placeholder="Nome, casa ou número" />}
        >
          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {lista.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                {conversas.length === 0
                  ? "Quando alguém escrever para o número da Tipe, a conversa aparece aqui."
                  : "Nenhuma conversa nesta visão."}
              </li>
            )}
            {lista.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => abrir(c.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${c.id === conversaId ? "bg-muted" : ""}`}
                >
                  <Avatar nome={c.name ?? c.phone} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.name ?? telefone(c.phone)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.last_message_at ? relativo(c.last_message_at) : ""}
                      </span>
                    </span>
                    {c.ficha?.restaurante && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.ficha.restaurante}
                        {c.ficha.cidade ? ` · ${c.ficha.cidade}` : ""}
                      </span>
                    )}
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      {c.precisa_humano && c.status !== "resolved" ? (
                        <StatusBadge tone="warning">Precisa de você</StatusBadge>
                      ) : c.optout ? (
                        <StatusBadge tone="neutral">Saiu da lista</StatusBadge>
                      ) : c.status === "resolved" ? (
                        <StatusBadge tone="neutral">Resolvida</StatusBadge>
                      ) : c.lebre_ativa ? (
                        <StatusBadge tone="brand">Lebre</StatusBadge>
                      ) : (
                        <StatusBadge tone="info">Equipe</StatusBadge>
                      )}
                      {c.temperatura && TEMP[c.temperatura] && (
                        <StatusBadge tone={TEMP[c.temperatura]!.tone}>
                          {TEMP[c.temperatura]!.l}
                        </StatusBadge>
                      )}
                      {c.unread > 0 && (
                        <span className="rounded-full bg-highlight px-1.5 font-semibold text-white">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Painel>

        {conv ? (
          <Chat d={d} conv={conv} voltar={() => abrir(undefined)} inv={inv} />
        ) : (
          <Painel className="hidden lg:block">
            <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center">
              <MessageCircle className="size-8 text-muted-foreground" />
              <p className="font-medium">Escolha uma conversa</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Comece pela fila "Precisam de você": são as conversas em que a Lebre pediu sua ajuda
                ou que precisam de confirmação.
              </p>
            </div>
          </Painel>
        )}

        {conv && <Ficha conv={conv} inv={inv} abrirLead={abrirLead} />}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Entradas />
        <ModelosMeta />
      </div>
    </div>
  );
}

function Chat({
  d,
  conv,
  voltar,
  inv,
}: {
  d: Com;
  conv: Conv;
  voltar: () => void;
  inv: () => Promise<unknown>;
}) {
  const [texto, setTexto] = useState("");
  const janela = janelaAberta(conv);
  const responder = useServerFn(sendWaReply);
  const atualizar = useServerFn(updateWaConversation);
  const mEnviar = useMutation({
    mutationFn: () => responder({ data: { conversaId: conv.id, body: texto } }),
    onSuccess: () => {
      setTexto("");
      toast.success("Mensagem enviada");
      inv();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mConv = useMutation({
    mutationFn: (v: {
      id: string;
      lebreAtiva?: boolean;
      status?: "open" | "waiting" | "resolved";
    }) => atualizar({ data: v }),
    onSuccess: () => inv(),
    onError: (e: Error) => toast.error(e.message),
  });
  const podeEnviar = janela && d.config.whatsappEnvio && !conv.optout;

  return (
    <Painel
      semPadding
      titulo={
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={voltar}
            className="-ml-1 rounded-md p-1 hover:bg-muted lg:hidden"
            aria-label="Voltar para a lista"
          >
            <ArrowLeft className="size-4" />
          </button>
          {conv.name ?? telefone(conv.phone)}
        </span>
      }
      descricao={`${telefone(conv.phone)}${conv.origem ? ` · veio por ${ORIGEM[conv.origem] ?? conv.origem}` : ""}`}
      acoes={
        <div className="flex flex-wrap gap-2">
          {!conv.optout &&
            (conv.lebre_ativa ? (
              <Button
                variant="outline"
                size="sm"
                disabled={mConv.isPending}
                onClick={() => mConv.mutate({ id: conv.id, lebreAtiva: false })}
              >
                <Hand className="size-4" /> Assumir conversa
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={mConv.isPending || !d.lebre.ativa}
                onClick={() => mConv.mutate({ id: conv.id, lebreAtiva: true })}
              >
                Devolver para a Lebre
              </Button>
            ))}
          {conv.status !== "resolved" ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={mConv.isPending}
              onClick={() => mConv.mutate({ id: conv.id, status: "resolved" })}
            >
              Resolver
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={mConv.isPending}
              onClick={() => mConv.mutate({ id: conv.id, status: "open" })}
            >
              Reabrir
            </Button>
          )}
        </div>
      }
    >
      <div className="flex h-[70vh] flex-col">
        {conv.precisa_humano && conv.status !== "resolved" && (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-warning/10 px-4 py-2 text-sm">
            <span>
              <strong>Precisa de você:</strong>{" "}
              {conv.motivo_humano ?? "a Lebre passou a conversa para a equipe"}.
            </span>
          </div>
        )}
        {conv.optout && (
          <div className="border-b border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
            Este contato pediu para não receber mensagens. Ninguém da Tipe deve escrever para ele.
          </div>
        )}
        <ol className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4" aria-live="polite">
          {d.mensagens.map((m: any) => (
            <li
              key={m.id}
              className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.direction === "out" ? (m.autor === "lebre" ? "bg-brand-soft" : "bg-white ring-1 ring-brand/30") : "bg-white"}`}
              >
                {m.direction === "out" && (
                  <p className="mb-0.5 text-[11px] font-semibold text-brand-strong">
                    {m.autor === "lebre" ? "Lebre" : "Equipe Tipe"}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-right text-[10px] text-muted-foreground">
                  {horaBR(m.at)}
                  {m.direction === "out" ? ` · ${STATUS[m.status] ?? m.status}` : ""}
                  {m.error ? ` · ${m.error}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="border-t border-border p-3">
          {podeEnviar && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {RAPIDAS.map((r) => (
                <button
                  key={r.l}
                  type="button"
                  onClick={() =>
                    setTexto(r.t.replace("{horário}", conv.ficha?.demo ?? "o horário combinado"))
                  }
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                >
                  {r.l}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (texto.trim()) mEnviar.mutate();
            }}
          >
            <textarea
              className={`${inputCls} min-h-10 flex-1 resize-none py-2`}
              rows={texto.length > 90 ? 3 : 1}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (texto.trim() && podeEnviar) mEnviar.mutate();
                }
              }}
              placeholder={
                conv.optout
                  ? "Contato fora da lista"
                  : !janela
                    ? "Mais de 24 h sem mensagem do cliente: só um modelo aprovado pela Meta"
                    : conv.lebre_ativa
                      ? "Escreva para assumir a conversa"
                      : "Escreva sua resposta"
              }
              disabled={!podeEnviar}
              maxLength={4000}
              aria-label="Mensagem"
            />
            <Button
              type="submit"
              variant="brand"
              disabled={!podeEnviar || !texto.trim() || mEnviar.isPending}
              aria-label="Enviar"
            >
              <Send className="size-4" />
            </Button>
          </form>
          {podeEnviar && conv.lebre_ativa && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Ao enviar, você assume a conversa e a Lebre para de responder este contato.
            </p>
          )}
        </div>
      </div>
    </Painel>
  );
}
const STATUS: Record<string, string> = {
  sent: "enviada",
  delivered: "entregue",
  read: "lida",
  failed: "falhou",
  queued: "na fila",
  received: "recebida",
};

function Ficha({
  conv,
  inv,
  abrirLead,
}: {
  conv: Conv;
  inv: () => Promise<unknown>;
  abrirLead: (id: string) => void;
}) {
  const f = (conv.ficha ?? {}) as Record<string, any>;
  const atualizar = useServerFn(updateWaConversation);
  const criar = useServerFn(criarLeadWa);
  const [form, setForm] = useState<{
    nome: string;
    restaurante: string;
    email: string;
    cidade: string;
  } | null>(null);
  const mEtapa = useMutation({
    mutationFn: (etapa: string) => atualizar({ data: { id: conv.id, etapa: etapa as any } }),
    onSuccess: () => inv(),
    onError: (e: Error) => toast.error(e.message),
  });
  const mLead = useMutation({
    mutationFn: () => criar({ data: { id: conv.id, ...form!, cidade: form!.cidade || undefined } }),
    onSuccess: (r) => {
      toast.success("Lead criado no CRM");
      setForm(null);
      inv();
      abrirLead(r.leadId);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const preenchidos = CAMPOS_FICHA.filter(([k]) => f[k] !== undefined && f[k] !== "");

  return (
    <Painel
      titulo="Ficha do lead"
      descricao="Montada pela Lebre durante a conversa"
      className="lg:col-span-2 xl:col-span-1"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {conv.temperatura && TEMP[conv.temperatura] ? (
            <StatusBadge tone={TEMP[conv.temperatura]!.tone}>
              {TEMP[conv.temperatura]!.l}
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Sem dados ainda</StatusBadge>
          )}
          {conv.origem && (
            <StatusBadge tone="info">{ORIGEM[conv.origem] ?? conv.origem}</StatusBadge>
          )}
        </div>
        <Campo label="Etapa">
          <select
            className={`${inputCls} h-9`}
            value={conv.etapa ?? "novo"}
            onChange={(e) => mEtapa.mutate(e.target.value)}
            disabled={mEtapa.isPending}
          >
            {ETAPAS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
        {preenchidos.length ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            {preenchidos.map(([k, l]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{l}</dt>
                <dd className="min-w-0 break-words font-medium">{String(f[k])}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nome, restaurante, mesas e a maior dor da casa aparecem aqui conforme a conversa avança.
          </p>
        )}

        {conv.lead_id ? (
          <Button variant="outline" className="w-full" onClick={() => abrirLead(conv.lead_id!)}>
            <Users className="size-4" /> Abrir no CRM
          </Button>
        ) : form ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              mLead.mutate();
            }}
          >
            <Campo label="Nome do contato">
              <input
                className={inputCls}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                minLength={2}
              />
            </Campo>
            <Campo label="Restaurante">
              <input
                className={inputCls}
                value={form.restaurante}
                onChange={(e) => setForm({ ...form, restaurante: e.target.value })}
                required
                minLength={2}
              />
            </Campo>
            <Campo label="E-mail">
              <input
                className={inputCls}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Campo>
            <Campo label="Cidade">
              <input
                className={inputCls}
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </Campo>
            <div className="flex gap-2">
              <Button type="submit" variant="brand" className="flex-1" disabled={mLead.isPending}>
                Criar lead
              </Button>
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="brand"
            className="w-full"
            onClick={() =>
              setForm({
                nome: f["nome"] ?? conv.name ?? "",
                restaurante: f["restaurante"] ?? "",
                email: f["email"] ?? "",
                cidade: f["cidade"] ?? "",
              })
            }
          >
            <UserPlus className="size-4" /> Criar lead no CRM
          </Button>
        )}
        {!conv.lead_id && (
          <p className="text-xs text-muted-foreground">
            A Lebre cria o lead sozinha quando tem nome, restaurante e e-mail. O CRM abre a
            oportunidade e a tarefa de contato.
          </p>
        )}
      </div>
    </Painel>
  );
}

function Entradas() {
  const [sel, setSel] = useState<string>(ENTRADAS[0].origem);
  const e = ENTRADAS.find((x) => x.origem === sel) ?? ENTRADAS[0];
  const link = linkEntrada(e.texto);
  return (
    <Painel
      titulo="Portas de entrada"
      descricao="Links e QR Code que abrem conversa com a Tipe. A Lebre reconhece a origem pela primeira mensagem."
    >
      <div className="space-y-4">
        <Segmentado
          label="Origem"
          value={sel}
          onChange={setSel}
          options={ENTRADAS.map((x) => [x.origem, x.rotulo] as [string, string])}
          className="flex-wrap"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0 self-center rounded-xl bg-white p-3 ring-1 ring-border">
            <QRCodeSVG value={link} size={132} level="M" fgColor="#021e34" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-muted-foreground">Mensagem que já vem escrita:</p>
            <p className="rounded-lg bg-muted/60 p-3 text-sm">{e.texto}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => copiar(link, "Link copiado")}>
                <Link2 className="size-4" /> Copiar link
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  Testar
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Painel>
  );
}

function ModelosMeta() {
  return (
    <Painel
      titulo="Modelos para aprovar na Meta"
      descricao="Para falar com quem não escreve há mais de 24 h. Cadastre no WhatsApp Manager › Modelos de mensagem, idioma Português (BR). Envio só para quem aceitou receber."
    >
      <ul className="space-y-3">
        {MODELOS_META.map((m) => (
          <li key={m.nome} className="rounded-lg border border-border p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <code className="text-xs font-semibold">{m.nome}</code>
              <span className="flex items-center gap-2">
                <StatusBadge tone="neutral">{m.categoria}</StatusBadge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copiar(m.corpo, "Texto do modelo copiado")}
                  aria-label={`Copiar ${m.nome}`}
                >
                  <Copy className="size-4" />
                </Button>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{m.corpo}</p>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
