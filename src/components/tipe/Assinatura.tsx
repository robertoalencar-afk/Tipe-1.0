import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { CardFields } from "@/components/tipe/CardFields";
import { Panel, StatusBadge, type Tone } from "@/components/tipe/ds";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cardValid, tokenizeCard, type CardInput } from "@/lib/tipe/pagarme-client";
import { getPaymentConfig } from "@/lib/tipe/payments.functions";
import {
  cancelSubscription,
  chooseSubscriptionPlan,
  getSubscription,
  startSubscription,
} from "@/lib/tipe/subscription.functions";
import { accessNotice, diasAte, MOTIVOS_CANCELAMENTO, type Access } from "@/lib/tipe/assinatura";
import { priceLabel, SHOW_PLAN_PRICES } from "@/lib/tipe/plans";
import { whatsappLink } from "@/lib/tipe/contact";

const STATUS: Record<string, { l: string; t: Tone }> = {
  trialing: { l: "Teste grátis", t: "brand" },
  active: { l: "Ativa", t: "success" },
  past_due: { l: "Pagamento atrasado", t: "warning" },
  suspended: { l: "Suspensa", t: "error" },
  canceled: { l: "Cancelada", t: "neutral" },
  expired: { l: "Teste encerrado", t: "error" },
};
const MODULO: Record<string, string> = {
  order: "Tipe Order",
  kds: "Tipe Cozinha",
  totem: "Totem",
  three_d: "Cardápio 3D",
  guest: "Tipe Reserva",
};
const dia = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "";

/** Faixa no topo do painel: carência, fim de teste próximo ou conta bloqueada. */
export function AvisoAssinatura({
  access,
  podeDono,
  onOpen,
}: {
  access: Access;
  podeDono: boolean;
  onOpen: () => void;
}) {
  const n = accessNotice(access);
  if (!n) return null;
  return (
    <div
      role={n.tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm print:hidden",
        n.tone === "error"
          ? "border-destructive/30 bg-destructive/[0.06]"
          : "border-warning/50 bg-warning/10",
      )}
    >
      <span>
        <strong className="font-medium">{n.title}.</strong> {n.text}
        {!podeDono &&
          access.reason !== "suspensa" &&
          " Peça ao responsável pelo restaurante para regularizar."}
      </span>
      {podeDono && (
        <Button size="sm" variant={n.tone === "error" ? "default" : "outline"} onClick={onOpen}>
          {access.state === "blocked" ? "Reativar assinatura" : "Ver assinatura"}
        </Button>
      )}
    </div>
  );
}

/** Conteúdo de uma seção fechada pela assinatura. */
export function ContaBloqueada({ podeDono, onOpen }: { podeDono: boolean; onOpen: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-medium">Esta seção volta com a assinatura ativa</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Novas mesas e pedidos ficam bloqueados. Mesas já abertas podem ser pagas normalmente, e
        caixa, histórico, relatórios e recebimentos continuam disponíveis.
      </p>
      {podeDono ? (
        <Button className="mt-5" onClick={onOpen}>
          Reativar assinatura
        </Button>
      ) : (
        <p className="mt-5 text-sm">
          Peça ao responsável pelo restaurante para regularizar a assinatura.
        </p>
      )}
    </div>
  );
}

export function Assinatura({ slug }: { slug: string }) {
  const fetchSub = useServerFn(getSubscription);
  const start = useServerFn(startSubscription);
  const choose = useServerFn(chooseSubscriptionPlan);
  const cancel = useServerFn(cancelSubscription);
  const qc = useQueryClient();
  const [card, setCard] = useState<CardInput>({ number: "", holder: "", exp: "", cvv: "" });
  const [pk, setPk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [confirma, setConfirma] = useState("");
  useEffect(() => {
    getPaymentConfig()
      .then((c) => setPk(c.publicKey))
      .catch(() => undefined);
  }, []);
  const q = useQuery({
    queryKey: ["subscription", slug],
    queryFn: () => fetchSub({ data: { slug } }),
  });
  const atualizar = () => {
    void q.refetch();
    void qc.invalidateQueries({ queryKey: ["account-access", slug] });
  };

  if (q.isLoading)
    return (
      <div
        className="h-64 max-w-2xl tipe-brilho rounded-2xl bg-surface motion-reduce:animate-none"
        aria-busy="true"
        aria-label="Carregando assinatura"
      />
    );
  if (q.isError)
    return (
      <Panel title="Assinatura">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar a assinatura.{" "}
          <button type="button" className="underline" onClick={() => q.refetch()}>
            Tentar de novo
          </button>
        </p>
      </Panel>
    );
  const s = q.data;
  if (!s)
    return (
      <Panel title="Assinatura">
        <p className="text-sm text-muted-foreground">
          Este restaurante ainda não tem uma assinatura cadastrada. Fale com a equipe TIPE.
        </p>
      </Panel>
    );

  const plano = s.catalog.find((c) => c.id === s.plan);
  const st =
    s.status === "trialing" && s.access.state === "blocked"
      ? STATUS["expired"]!
      : (STATUS[s.status] ?? { l: s.status, t: "neutral" as Tone });
  const aviso = accessNotice(s.access);
  // Até quando a conta segue funcionando se cancelar agora (só datas futuras).
  const fimUsoBruto = s.current_period_end ?? (s.status === "trialing" ? s.trial_ends_at : null);
  const fimUso = fimUsoBruto && Date.parse(fimUsoBruto) > Date.now() ? fimUsoBruto : null;
  const podeEscolher =
    !s.exempt && !(s.hasCard && ["active", "past_due"].includes(s.status)) && !!plano;
  const precisaCartao = !s.exempt && (s.status !== "active" || !s.hasCard);
  const textoBotao =
    s.status === "past_due" && s.hasCard
      ? "Atualizar cartão"
      : s.status === "canceled" || s.access.state === "blocked"
        ? "Reativar assinatura"
        : "Contratar plano";

  async function rodar(chave: string, fn: () => Promise<void>) {
    setBusy(chave);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Panel
        title={plano?.name ?? "Personalizado"}
        description={
          plano ? `Até ${plano.maxTables ?? "—"} mesas` : "Condições negociadas com a TIPE"
        }
        actions={
          <StatusBadge tone={s.exempt ? "info" : st.t}>{s.exempt ? "Isenta" : st.l}</StatusBadge>
        }
      >
        {s.exempt ? (
          <p className="text-sm text-muted-foreground">
            Esta conta é isenta de cobrança (demonstração ou cortesia da TIPE). Tudo funciona sem
            cartão.
          </p>
        ) : aviso ? (
          <div
            className={cn(
              "rounded-xl p-4 text-sm",
              aviso.tone === "error" ? "bg-destructive/[0.06]" : "bg-warning/10",
            )}
          >
            <p className="font-medium">{aviso.title}</p>
            <p className="mt-1 text-muted-foreground">{aviso.text}</p>
          </div>
        ) : s.status === "trialing" ? (
          <p className="text-sm text-muted-foreground">
            Teste grátis até {dia(s.trial_ends_at)} ({diasAte(s.trial_ends_at)} dia(s)). Nenhuma
            cobrança foi feita até agora.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {s.current_period_end
              ? `Próxima cobrança em ${dia(s.current_period_end)}.`
              : "Assinatura em dia."}
          </p>
        )}
      </Panel>

      {podeEscolher && (
        <Panel
          title="Plano"
          description="Você pode trocar de plano até ativar a cobrança mensal. Depois, a troca é feita com a equipe TIPE."
        >
          <div role="radiogroup" aria-label="Planos" className="grid gap-3 sm:grid-cols-3">
            {s.catalog.map((c) => {
              const sel = c.id === s.plan;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  disabled={!!busy}
                  onClick={() =>
                    !sel &&
                    rodar(`plano-${c.id}`, async () => {
                      await choose({
                        data: { slug, plan: c.id as "essencial" | "profissional" | "premium" },
                      });
                      toast.success(`Plano ${c.name} escolhido.`);
                      atualizar();
                    })
                  }
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    sel
                      ? "border-foreground ring-1 ring-foreground"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  <span className="flex items-center justify-between font-medium">
                    {c.name}
                    {sel && <Check className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {SHOW_PLAN_PRICES && c.price !== null ? `R$ ${priceLabel(c.price)}/mês · ` : ""}
                    até {c.maxTables ?? "—"} mesas
                  </span>
                  {c.modules.length > 0 && (
                    <span className="mt-2 block text-xs">
                      Inclui {c.modules.map((m) => MODULO[m] ?? m).join(", ")}
                    </span>
                  )}
                  {busy === `plano-${c.id}` && (
                    <span className="mt-2 block text-xs text-muted-foreground">Salvando…</span>
                  )}
                </button>
              );
            })}
          </div>
          {!SHOW_PLAN_PRICES && (
            <p className="mt-3 text-xs text-muted-foreground">
              Consulte as condições de contratação com a equipe Tipe.
            </p>
          )}
        </Panel>
      )}

      {precisaCartao && (
        <Panel title="Cobrança mensal" description="Cartão de crédito da empresa. Sem fidelidade.">
          {pk ? (
            <CardFields value={card} onChange={setCard} />
          ) : (
            <p className="text-sm text-muted-foreground">
              A cobrança pelo cartão será liberada em breve. Enquanto isso, a equipe TIPE ativa a
              sua conta.
            </p>
          )}
          {!pk ? (
            <Button asChild className="mt-4 w-full">
              <a
                href={whatsappLink(
                  `Olá, TIPE! Quero ativar a assinatura do plano ${plano?.name ?? s.plan} para o restaurante tipe.digital/${slug}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a equipe TIPE
              </a>
            </Button>
          ) : (
            <Button
              className="mt-4 w-full"
              disabled={!!busy || !cardValid(card)}
              onClick={() =>
                rodar("ativar", async () => {
                  const cardToken = await tokenizeCard(pk, card);
                  const r = await start({ data: { slug, cardToken } });
                  if (r.ok) {
                    toast.success(r.message);
                    atualizar();
                  } else toast.info(r.message);
                })
              }
            >
              {busy === "ativar" ? "Processando…" : textoBotao}
            </Button>
          )}
        </Panel>
      )}

      {!s.exempt && s.status !== "canceled" && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
          <span className="text-muted-foreground">
            Sem fidelidade. Cancele quando quiser, aqui mesmo.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setCancelando(true)}
          >
            Cancelar assinatura
          </Button>
        </div>
      )}

      <Dialog
        open={cancelando}
        onOpenChange={(o) => {
          setCancelando(o);
          if (!o) {
            setConfirma("");
            setMotivo("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar a assinatura da TIPE?</DialogTitle>
            <DialogDescription>
              {fimUso
                ? `Você continua usando até ${dia(fimUso)}. Depois, novas mesas e pedidos ficam bloqueados.`
                : "Novas mesas e pedidos ficam bloqueados na hora."}{" "}
              Mesas abertas podem ser pagas, e relatórios e recebimentos continuam disponíveis.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium" htmlFor="motivo-cancelamento">
            Motivo
          </label>
          <select
            id="motivo-cancelamento"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          >
            <option value="">Escolha um motivo</option>
            {MOTIVOS_CANCELAMENTO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <label className="block text-sm font-medium" htmlFor="confirma-cancelamento">
            Digite CANCELAR para confirmar
          </label>
          <Input
            id="confirma-cancelamento"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelando(false)}>
              Manter assinatura
            </Button>
            <Button
              variant="destructive"
              disabled={
                !motivo || confirma.trim().toUpperCase() !== "CANCELAR" || busy === "cancelar"
              }
              onClick={() =>
                rodar("cancelar", async () => {
                  const r = await cancel({ data: { slug, confirm: confirma, reason: motivo } });
                  toast.success(
                    r.until
                      ? `Assinatura cancelada. Você usa a TIPE até ${dia(r.until)}.`
                      : "Assinatura cancelada.",
                  );
                  setCancelando(false);
                  atualizar();
                })
              }
            >
              {busy === "cancelar" ? "Cancelando…" : "Cancelar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
