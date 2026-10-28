import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  FileSignature,
  Flag,
  Gift,
  History,
  MessageSquareText,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  activeMembers,
  fpActionLabel,
  FP_CHANNEL_LABEL,
  FP_FEEDBACK_TOPIC,
  FP_STATUS,
  FP_TRANSITIONS,
  PENDING_COMMERCIAL,
  reasonRequired,
  rulesApproved,
  rulesOf,
  transitionBlocker,
} from "@/lib/tipe/crm/founding-partner";
import type {
  FoundingPartnerChannel,
  FoundingPartnerEnrollment,
  FoundingPartnerFeedback,
  FoundingPartnerStatus,
  RestaurantAccount,
} from "@/lib/tipe/crm/types";
import { useCrm } from "./context";
import { Btn, dateBR, dateTimeBR, Field, Pill, Select, TextArea, TextInput } from "./ui";

// Peças do programa Restaurante Fundador (camada B), usadas na visão do programa e no card
// da conta. Toda escrita passa pelo motor; aqui só se pede confirmação e se mostra o motivo
// de cada recusa.

export function FpStatusPill({ status }: { status: FoundingPartnerStatus }) {
  const st = FP_STATUS[status];
  return <Pill tone={st.tone}>{st.label}</Pill>;
}

/** Diálogo de mudança de estado com confirmação nomeada (ação + restaurante). */
export function TransitionDialog({
  enrollment,
  account,
  to,
  open,
  onOpenChange,
}: {
  enrollment: FoundingPartnerEnrollment;
  account: RestaurantAccount;
  to: FoundingPartnerStatus;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { run } = useCrm();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const needsReason = reasonRequired(enrollment.status, to);
  const destructive = to === "encerrado" || to === "suspenso";
  const label = `${fpActionLabel(enrollment.status, to)} de ${account.name}`;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setReason("");
          setError(undefined);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="crm-panel max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-base">{label}?</DialogTitle>
          <DialogDescription>
            {FP_STATUS[enrollment.status].label} → {FP_STATUS[to].label}. {FP_STATUS[to].hint} A
            mudança fica na trilha de auditoria com seu nome, data e hora.
          </DialogDescription>
        </DialogHeader>
        {needsReason && (
          <Field label="Motivo" error={error} hint="Obrigatório. Fica registrado na trilha.">
            {(id, describedBy) => (
              <TextArea
                id={id}
                rows={3}
                value={reason}
                aria-describedby={describedBy}
                aria-invalid={!!error}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(undefined);
                }}
              />
            )}
          </Field>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Btn variant="outline" onClick={() => onOpenChange(false)}>
            Manter como está
          </Btn>
          <Btn
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              if (needsReason && reason.trim().length < 3) {
                setError("Escreva o motivo, com pelo menos 3 letras.");
                return;
              }
              const r = run({ type: "fpTransition", enrollmentId: enrollment.id, to, reason });
              if (r.ok) {
                setReason("");
                onOpenChange(false);
              } else setError(r.error);
            }}
          >
            {label}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Botões das transições possíveis a partir do estado atual. */
export function TransitionActions({
  enrollment,
  account,
  compact,
}: {
  enrollment: FoundingPartnerEnrollment;
  account: RestaurantAccount;
  compact?: boolean | undefined;
}) {
  const { s, can, org } = useCrm();
  const [target, setTarget] = useState<FoundingPartnerStatus | null>(null);
  if (!can("founding.manage")) return null;
  const rules = rulesOf(s, org.id);
  const options = FP_TRANSITIONS[enrollment.status];
  if (!options.length)
    return (
      <p className="text-xs text-muted-foreground">
        Participação encerrada. Para voltar, faça um novo convite.
      </p>
    );
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((to) => {
        const blocker = transitionBlocker({
          enrollment,
          to,
          account,
          rules,
          activeCount: activeMembers(s, org.id),
          // O motivo é pedido no diálogo; aqui só se conferem as outras regras.
          reason: "motivo",
        });
        return (
          <Btn
            key={to}
            size={compact ? "sm" : "default"}
            variant={to === "encerrado" || to === "suspenso" ? "ghost" : "outline"}
            className={cn(
              (to === "encerrado" || to === "suspenso") &&
                "text-destructive hover:text-destructive",
            )}
            disabled={!!blocker}
            title={blocker ?? FP_STATUS[to].hint}
            onClick={() => setTarget(to)}
          >
            {fpActionLabel(enrollment.status, to)}
          </Btn>
        );
      })}
      {target && (
        <TransitionDialog
          enrollment={enrollment}
          account={account}
          to={target}
          open={!!target}
          onOpenChange={(v) => !v && setTarget(null)}
        />
      )}
    </div>
  );
}

/** Regras comerciais: vazias por padrão, mostradas como pendentes. */
export function RulesSummary() {
  const { s, org } = useCrm();
  const r = rulesOf(s, org.id);
  const pending = <span className="text-muted-foreground">{PENDING_COMMERCIAL}</span>;
  const rows: [string, ReactNode][] = [
    ["Vagas", r.approvedAt && r.slots !== null ? String(r.slots) : pending],
    [
      "Período de inscrição",
      r.approvedAt && (r.enrollmentOpensAt || r.enrollmentClosesAt)
        ? `${r.enrollmentOpensAt ? dateBR(r.enrollmentOpensAt) : "sem início"} a ${r.enrollmentClosesAt ? dateBR(r.enrollmentClosesAt) : "sem fim"}`
        : pending,
    ],
    [
      "Vantagens",
      rulesApproved(r) ? (
        <ul className="list-disc pl-4">
          {r.advantages.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : (
        pending
      ),
    ],
    [
      "Termos do programa",
      r.termsVersion ? (
        <span>
          Versão {r.termsVersion}
          {r.termsVersion.startsWith("demo") && (
            <span className="text-muted-foreground"> · texto fictício, sem revisão jurídica</span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground">Pendente de revisão jurídica</span>
      ),
    ],
  ];
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[9.5rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
      {r.approvedAt && (
        <p className="pt-2.5 text-xs text-muted-foreground">
          Aprovação registrada em {dateBR(r.approvedAt)} · referência {r.approvalRef}
        </p>
      )}
    </dl>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: typeof Flag;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-[0.82rem] font-semibold">
          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

const muted = "text-xs text-muted-foreground";

/** Ficha completa de uma adesão: estado, termos, piloto, convites, benefícios, contatos e trilha. */
export function EnrollmentDetail({
  enrollment: e,
  account: a,
}: {
  enrollment: FoundingPartnerEnrollment;
  account: RestaurantAccount;
}) {
  const { s, org, can, run, user } = useCrm();
  const rules = rulesOf(s, org.id);
  const manage = can("founding.manage");
  const write = can("accounts.manage");
  const [signer, setSigner] = useState("");
  const [pilotNote, setPilotNote] = useState("");
  const [commChannel, setCommChannel] = useState<FoundingPartnerChannel>("whatsapp");
  const [commDir, setCommDir] = useState<"enviada" | "recebida">("enviada");
  const [comm, setComm] = useState("");
  const [topic, setTopic] = useState<FoundingPartnerFeedback["topic"]>("produto");
  const [fb, setFb] = useState("");
  const termsCurrent = !!rules.termsVersion && e.terms?.version === rules.termsVersion;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/crm/contas/$id"
            params={{ id: a.id }}
            className="group inline-flex items-center gap-1 font-display text-lg font-semibold tracking-tight hover:underline"
          >
            {a.name}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
          </Link>
          <p className={muted}>
            {[a.segment, a.neighborhood].filter(Boolean).join(" · ")} · responsável{" "}
            {user(a.csmId)?.name ?? "—"}
          </p>
        </div>
        <FpStatusPill status={e.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Convidado em</dt>
          <dd className="font-medium">{dateBR(e.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Data de entrada</dt>
          <dd className="font-medium">{e.joinedAt ? dateBR(e.joinedAt) : "Ainda não entrou"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado desde</dt>
          <dd className="font-medium">{dateBR(e.statusChangedAt)}</dd>
        </div>
      </dl>
      <TransitionActions enrollment={e} account={a} compact />

      <Section icon={FileSignature} title="Aceite dos termos">
        {e.terms ? (
          <p className="text-sm">
            Versão <strong>{e.terms.version}</strong>, aceita por {e.terms.acceptedByName} em{" "}
            {dateTimeBR(e.terms.acceptedAt)}
            {!termsCurrent && rules.termsVersion && (
              <span className="block text-xs text-warning">
                Versão vigente agora: {rules.termsVersion}. Registre um novo aceite.
              </span>
            )}
          </p>
        ) : (
          <p className={muted}>Sem aceite registrado.</p>
        )}
        {manage &&
          !termsCurrent &&
          e.status !== "encerrado" &&
          (rules.termsVersion ? (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(ev) => {
                ev.preventDefault();
                const r = run({
                  type: "fpRecordTerms",
                  enrollmentId: e.id,
                  acceptedByName: signer,
                });
                if (r.ok) setSigner("");
              }}
            >
              <Field label={`Quem aceitou a versão ${rules.termsVersion}`} className="flex-1">
                {(id) => (
                  <TextInput
                    id={id}
                    value={signer}
                    autoComplete="off"
                    onChange={(ev) => setSigner(ev.target.value)}
                  />
                )}
              </Field>
              <Btn type="submit" variant="outline">
                Registrar aceite
              </Btn>
            </form>
          ) : (
            <p className={muted}>Os termos ainda não têm versão aprovada.</p>
          ))}
      </Section>

      <Section icon={Flag} title="Elegibilidade para o piloto">
        <p className="text-sm">
          {e.pilotEligible ? (
            <>
              <strong>Elegível.</strong> {e.pilotNote}
            </>
          ) : (
            <span className="text-muted-foreground">Não marcada como elegível.</span>
          )}
        </p>
        {manage &&
          e.status !== "encerrado" &&
          (e.pilotEligible ? (
            <Btn
              size="sm"
              variant="ghost"
              disabled={e.status === "selecionado_piloto"}
              title={
                e.status === "selecionado_piloto"
                  ? "Tire o restaurante do piloto antes"
                  : "Remove a elegibilidade para o piloto"
              }
              onClick={() =>
                run({ type: "fpSetPilotEligibility", enrollmentId: e.id, eligible: false })
              }
            >
              Remover elegibilidade
            </Btn>
          ) : (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(ev) => {
                ev.preventDefault();
                const r = run({
                  type: "fpSetPilotEligibility",
                  enrollmentId: e.id,
                  eligible: true,
                  note: pilotNote,
                });
                if (r.ok) setPilotNote("");
              }}
            >
              <Field label="Por que é elegível" className="flex-1">
                {(id) => (
                  <TextInput
                    id={id}
                    value={pilotNote}
                    onChange={(ev) => setPilotNote(ev.target.value)}
                  />
                )}
              </Field>
              <Btn type="submit" variant="outline">
                Marcar como elegível
              </Btn>
            </form>
          ))}
      </Section>

      <Section icon={Gift} title="Benefícios concedidos">
        {e.benefits.length === 0 ? (
          <p className={muted}>
            Nenhum benefício concedido.{" "}
            {!rulesApproved(rules) && `Vantagens: ${PENDING_COMMERCIAL.toLowerCase()}.`}
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {e.benefits.map((b) => (
              <li key={b.id} className={cn(b.revokedAt && "text-muted-foreground line-through")}>
                {b.advantage}{" "}
                <span className={muted}>
                  · {dateBR(b.grantedAt)} · aprovação {b.approvalRef}
                </span>
              </li>
            ))}
          </ul>
        )}
        {manage && rulesApproved(rules) && (
          <div className="flex flex-wrap gap-2">
            {rules.advantages
              .filter((adv) => !e.benefits.some((b) => b.advantage === adv && !b.revokedAt))
              .map((adv) => (
                <Btn
                  key={adv}
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    run({ type: "fpGrantBenefit", enrollmentId: e.id, advantage: adv })
                  }
                >
                  Conceder: {adv}
                </Btn>
              ))}
          </div>
        )}
      </Section>

      <Section icon={Send} title={`Convites (${e.invites.length})`}>
        <ul className="space-y-1 text-xs">
          {e.invites.map((i) => (
            <li key={i.id} className="text-muted-foreground">
              <span className="font-medium text-foreground">{FP_CHANNEL_LABEL[i.channel]}</span> ·{" "}
              {dateTimeBR(i.at)} · {user(i.sentBy)?.name ?? "—"}
              {i.simulated && " · simulado, nada enviado"}
              {i.note && <span className="block">{i.note}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={MessageSquareText} title="Comunicações e feedback">
        {e.communications.length + e.feedback.length === 0 ? (
          <p className={muted}>Nada registrado ainda.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {[
              ...e.communications.map((c) => ({
                id: c.id,
                at: c.at,
                head: `${FP_CHANNEL_LABEL[c.channel]} · ${c.direction}`,
                text: c.summary,
                by: c.by,
              })),
              ...e.feedback.map((f) => ({
                id: f.id,
                at: f.at,
                head: `Feedback · ${FP_FEEDBACK_TOPIC[f.topic]}`,
                text: f.text,
                by: f.by,
              })),
            ]
              .sort((x, y) => y.at.localeCompare(x.at))
              .map((x) => (
                <li key={x.id}>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{x.head}</span> ·{" "}
                    {dateTimeBR(x.at)} · {user(x.by)?.name ?? "—"}
                  </p>
                  <p className="text-sm">{x.text}</p>
                </li>
              ))}
          </ul>
        )}
        {write && e.status !== "encerrado" && (
          <div className="grid gap-4">
            <form
              className="space-y-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                const r = run({
                  type: "fpLogCommunication",
                  enrollmentId: e.id,
                  channel: commChannel,
                  direction: commDir,
                  summary: comm,
                });
                if (r.ok) setComm("");
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="Canal">
                  {(id) => (
                    <Select
                      id={id}
                      value={commChannel}
                      onChange={(ev) => setCommChannel(ev.target.value as FoundingPartnerChannel)}
                    >
                      {Object.entries(FP_CHANNEL_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Sentido">
                  {(id) => (
                    <Select
                      id={id}
                      value={commDir}
                      onChange={(ev) => setCommDir(ev.target.value as "enviada" | "recebida")}
                    >
                      <option value="enviada">Enviada</option>
                      <option value="recebida">Recebida</option>
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="Resumo da conversa">
                {(id) => (
                  <TextArea
                    id={id}
                    rows={2}
                    value={comm}
                    onChange={(ev) => setComm(ev.target.value)}
                  />
                )}
              </Field>
              <Btn type="submit" size="sm" variant="outline">
                Registrar comunicação
              </Btn>
            </form>
            <form
              className="space-y-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                const r = run({ type: "fpAddFeedback", enrollmentId: e.id, topic, text: fb });
                if (r.ok) setFb("");
              }}
            >
              <Field label="Assunto do feedback">
                {(id) => (
                  <Select
                    id={id}
                    value={topic}
                    onChange={(ev) => setTopic(ev.target.value as FoundingPartnerFeedback["topic"])}
                  >
                    {Object.entries(FP_FEEDBACK_TOPIC).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="O que o restaurante disse">
                {(id) => (
                  <TextArea id={id} rows={2} value={fb} onChange={(ev) => setFb(ev.target.value)} />
                )}
              </Field>
              <Btn type="submit" size="sm" variant="outline">
                Registrar feedback
              </Btn>
            </form>
          </div>
        )}
      </Section>

      <Section icon={History} title="Trilha de auditoria">
        <ol className="space-y-2 border-l border-border pl-3 text-xs">
          {e.history.map((h) => (
            <li key={h.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
              />
              <p>
                <span className="font-medium">{h.detail}</span>
              </p>
              <p className="text-muted-foreground">
                {dateTimeBR(h.at)} · {user(h.actorId)?.name ?? "—"}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

/** Formulário curto de convite (canal e observação), com a conta já escolhida ou não. */
export function InviteForm({
  accounts,
  fixedAccountId,
  onDone,
}: {
  accounts: RestaurantAccount[];
  fixedAccountId?: string | undefined;
  onDone?: ((enrollmentId: string) => void) | undefined;
}) {
  const { run } = useCrm();
  const [accountId, setAccountId] = useState(fixedAccountId ?? "");
  const [channel, setChannel] = useState<FoundingPartnerChannel>("email");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <form
      className="space-y-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!accountId) {
          setError("Escolha o restaurante.");
          return;
        }
        const r = run({ type: "fpInvite", accountId, channel, note });
        if (r.ok) {
          setNote("");
          if (!fixedAccountId) setAccountId("");
          if (r.id) onDone?.(r.id);
        }
      }}
    >
      {!fixedAccountId && (
        <Field label="Restaurante" error={error}>
          {(id, describedBy) => (
            <Select
              id={id}
              value={accountId}
              aria-describedby={describedBy}
              aria-invalid={!!error}
              onChange={(ev) => {
                setAccountId(ev.target.value);
                setError(undefined);
              }}
            >
              <option value="">Escolha uma conta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <div className="grid grid-cols-[8rem_1fr] gap-2">
        <Field label="Canal">
          {(id) => (
            <Select
              id={id}
              value={channel}
              onChange={(ev) => setChannel(ev.target.value as FoundingPartnerChannel)}
            >
              {Object.entries(FP_CHANNEL_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Observação (opcional)">
          {(id) => <TextInput id={id} value={note} onChange={(ev) => setNote(ev.target.value)} />}
        </Field>
      </div>
      <Btn type="submit" className="w-full sm:w-auto">
        <Send className="h-3.5 w-3.5" />
        Registrar convite
      </Btn>
      <p className="text-xs text-muted-foreground">
        Modo demonstração: o convite fica registrado no CRM e nada é enviado ao restaurante.
      </p>
    </form>
  );
}

/** Card compacto na página da conta: estado no programa, termos, piloto e ações. */
export function FoundingPartnerCard({ account }: { account: RestaurantAccount }) {
  const { s, org, can } = useCrm();
  const [inviting, setInviting] = useState(false);
  if (!org.tipePlatform || !can("founding.view")) return null;
  const e = s.foundingPartners.find((x) => x.accountId === account.id && x.orgId === org.id);
  const rules = rulesOf(s, org.id);
  const last = e?.history[0];
  return (
    <section className="crm-panel min-w-0 p-5" aria-labelledby={`fp-card-${account.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id={`fp-card-${account.id}`}
            className="flex items-center gap-1.5 font-display text-[0.95rem] font-semibold tracking-tight"
          >
            <Flag className="h-4 w-4 text-primary" aria-hidden />
            Restaurante Fundador
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Programa de parceria com os primeiros restaurantes da Tipe
          </p>
        </div>
        {e ? <FpStatusPill status={e.status} /> : <Pill>Fora do programa</Pill>}
      </header>
      {e ? (
        <div className="mt-3 space-y-3">
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Entrada</dt>
              <dd className="font-medium">{e.joinedAt ? dateBR(e.joinedAt) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Termos</dt>
              <dd className="font-medium">
                {e.terms ? `Versão ${e.terms.version}` : "Sem aceite"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Piloto</dt>
              <dd className="font-medium">
                {e.status === "selecionado_piloto"
                  ? "Selecionado"
                  : e.pilotEligible
                    ? "Elegível"
                    : "Não elegível"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Benefícios</dt>
              <dd className="font-medium">
                {e.benefits.filter((b) => !b.revokedAt).length || "Nenhum"}
                {!rulesApproved(rules) && (
                  <span className="block font-normal text-muted-foreground">
                    {PENDING_COMMERCIAL}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {last && (
            <p className="text-xs text-muted-foreground">
              Último registro: {last.detail} · {dateTimeBR(last.at)}
            </p>
          )}
          <TransitionActions enrollment={e} account={account} compact />
          <Link
            to="/crm/fundador"
            search={{ conta: account.id }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Abrir ficha completa e trilha
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Esta conta ainda não foi convidada.
            {account.status === "cancelada" && " Contas canceladas não entram no programa."}
          </p>
          {can("founding.manage") &&
            account.status !== "cancelada" &&
            (inviting ? (
              <InviteForm
                accounts={[account]}
                fixedAccountId={account.id}
                onDone={() => setInviting(false)}
              />
            ) : (
              <Btn size="sm" variant="outline" onClick={() => setInviting(true)}>
                <Send className="h-3.5 w-3.5" />
                Convidar {account.name}
              </Btn>
            ))}
        </div>
      )}
    </section>
  );
}
