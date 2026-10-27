import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LifeBuoy, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { TICKET_STATUS } from "@/components/tipe/crm/labels";
import {
  Btn,
  dateTimeBR,
  Empty,
  Field,
  PageHeader,
  Pill,
  PriorityPill,
  relative,
  Segmented,
  Select,
  TextArea,
  TextInput,
  UserChip,
} from "@/components/tipe/crm/ui";
import type { Priority, TicketStatus } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/suporte")({
  validateSearch: z.object({ chamado: z.string().optional().catch(undefined) }),
  component: Suporte,
});

const CATEGORIES = [
  "Produto",
  "Restaurante",
  "Integração",
  "Acesso",
  "Comercial",
  "Financeiro",
  "Outro",
];

function Suporte() {
  const { chamado } = Route.useSearch();
  const navigate = useNavigate();
  const { user, me, members, can, run } = useCrm();
  const d = useOrgData();
  const [view, setView] = useState<"abertos" | "restaurantes" | "meus" | "resolvidos">("abertos");
  const accName = (id?: string) => d.accounts.find((a) => a.id === id)?.name;
  const [creating, setCreating] = useState(false);
  const [reply, setReply] = useState("");
  const list = d.tickets
    .filter(
      (t) =>
        (view === "resolvidos" ? t.status === "resolvido" : t.status !== "resolvido") &&
        (view !== "meus" || t.requesterId === me.id || t.assigneeId === me.id) &&
        (view !== "restaurantes" || !!t.accountId),
    )
    .sort(
      (a, b) =>
        ({ alta: 0, media: 1, baixa: 2 })[a.priority] -
          { alta: 0, media: 1, baixa: 2 }[b.priority] || b.createdAt.localeCompare(a.createdAt),
    );
  const t = d.tickets.find((x) => x.id === chamado);
  const manage = can("tickets.manage");

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Camada B · Restaurantes"
        title="Suporte"
        description="Chamados dos restaurantes clientes e da equipe interna. Chamado de restaurante pesa na saúde da conta e avisa o responsável de sucesso."
        actions={
          <>
            <Segmented
              label="Fila"
              value={view}
              onChange={setView}
              options={[
                {
                  value: "abertos",
                  label: `Em aberto (${d.tickets.filter((x) => x.status !== "resolvido").length})`,
                },
                {
                  value: "restaurantes",
                  label: `Restaurantes (${d.tickets.filter((x) => x.accountId && x.status !== "resolvido").length})`,
                },
                { value: "meus", label: "Meus" },
                { value: "resolvidos", label: "Resolvidos" },
              ]}
            />
            {can("tickets.write") && (
              <Btn onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Abrir chamado
              </Btn>
            )}
          </>
        }
      />
      {list.length === 0 ? (
        <Empty
          icon={LifeBuoy}
          title="Nenhum chamado nesta fila"
          text="Quando alguém da equipe precisar de ajuda, o chamado aparece aqui."
        />
      ) : (
        <div className="crm-panel overflow-hidden">
          <ul className="divide-y divide-border">
            {list.map((x) => (
              <li key={x.id}>
                <Link
                  to="/crm/suporte"
                  search={{ chamado: x.id }}
                  className="grid gap-1 px-4 py-3 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{x.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {accName(x.accountId) ? `${accName(x.accountId)} · ` : "Interno · "}
                      {x.category} · aberto por {user(x.requesterId)?.name.split(" ")[0]}{" "}
                      {relative(x.createdAt)} · {x.comments.length} respostas
                    </span>
                  </span>
                  <PriorityPill p={x.priority} />
                  <Pill tone={TICKET_STATUS[x.status].tone}>{TICKET_STATUS[x.status].label}</Pill>
                  <UserChip user={user(x.assigneeId)} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Sheet
        open={!!t}
        onOpenChange={(o) => !o && navigate({ to: "/crm/suporte", search: { chamado: undefined } })}
      >
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-md">
          {t && (
            <>
              <SheetTitle className="pr-6 font-display text-lg">{t.title}</SheetTitle>
              <SheetDescription className="text-xs">
                {t.category} · {dateTimeBR(t.createdAt)} · {user(t.requesterId)?.name}
              </SheetDescription>
              {t.accountId && accName(t.accountId) && (
                <Link
                  to="/crm/contas/$id"
                  params={{ id: t.accountId }}
                  className="mt-2 inline-flex rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary hover:underline"
                >
                  Restaurante: {accName(t.accountId)}
                </Link>
              )}
              <p className="mt-3 whitespace-pre-line text-sm">{t.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Field label="Status">
                  {(id) => (
                    <Select
                      id={id}
                      disabled={!manage && t.requesterId !== me.id}
                      value={t.status}
                      onChange={(e) =>
                        run(
                          {
                            type: "updateTicket",
                            id: t.id,
                            status: e.target.value as TicketStatus,
                          },
                          "Chamado atualizado",
                        )
                      }
                    >
                      <option value="aberto">Aberto</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="resolvido">Resolvido</option>
                    </Select>
                  )}
                </Field>
                <Field label="Responsável">
                  {(id) => (
                    <Select
                      id={id}
                      disabled={!manage}
                      value={t.assigneeId ?? ""}
                      onChange={(e) =>
                        e.target.value &&
                        run(
                          { type: "updateTicket", id: t.id, assigneeId: e.target.value },
                          "Chamado atribuído",
                        )
                      }
                    >
                      <option value="">Ninguém</option>
                      {members.map(({ user: u }) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Conversa
              </h3>
              <ul className="mt-2 space-y-2">
                {t.comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">
                    {c.text}
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      {user(c.userId)?.name} · {relative(c.at)}
                    </p>
                  </li>
                ))}
                {!t.comments.length && (
                  <li className="text-xs text-muted-foreground">Sem respostas ainda.</li>
                )}
              </ul>
              {can("tickets.write") && (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      run({ type: "commentTicket", id: t.id, text: reply }, "Resposta enviada").ok
                    )
                      setReply("");
                  }}
                >
                  <TextArea
                    aria-label="Responder chamado"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Responder"
                    className="min-h-16"
                  />
                  <div className="flex justify-end">
                    <Btn type="submit" disabled={!reply.trim()}>
                      Responder
                    </Btn>
                  </div>
                </form>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
      <NewTicket open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function NewTicket({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run } = useCrm();
  const d = useOrgData();
  const [f, setF] = useState({
    title: "",
    description: "",
    category: "Produto",
    priority: "media" as Priority,
    accountId: "",
  });
  const [touched, setTouched] = useState<{ title?: boolean; description?: boolean }>({});
  const errs = {
    title: f.title.trim().length < 4 ? "Descreva o assunto em pelo menos 4 letras." : undefined,
    description:
      f.description.trim().length < 10 ? "Explique o que aconteceu (mínimo 10 letras)." : undefined,
  };
  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ title: true, description: true });
    if (errs.title || errs.description) return;
    if (
      run(
        { type: "createTicket", ...f, accountId: f.accountId || undefined },
        "Chamado aberto. A equipe de suporte foi avisada.",
      ).ok
    ) {
      onOpenChange(false);
      setF({ title: "", description: "", category: "Produto", priority: "media", accountId: "" });
      setTouched({});
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Abrir chamado</DialogTitle>
          <DialogDescription className="text-xs">
            Avisa atendentes e administradores da organização.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <Field label="Assunto" error={touched.title ? errs.title : undefined}>
            {(id, dd) => (
              <TextInput
                id={id}
                autoFocus
                aria-describedby={dd}
                aria-invalid={!!(touched.title && errs.title) || undefined}
                value={f.title}
                onBlur={() => setTouched({ ...touched, title: true })}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            )}
          </Field>
          <Field label="O que aconteceu" error={touched.description ? errs.description : undefined}>
            {(id, dd) => (
              <TextArea
                id={id}
                aria-describedby={dd}
                aria-invalid={!!(touched.description && errs.description) || undefined}
                value={f.description}
                onBlur={() => setTouched({ ...touched, description: true })}
                onChange={(e) => setF({ ...f, description: e.target.value })}
              />
            )}
          </Field>
          <Field label="Restaurante" hint="Deixe em branco para um chamado interno.">
            {(id, dd) => (
              <Select
                id={id}
                aria-describedby={dd}
                value={f.accountId}
                onChange={(e) => setF({ ...f, accountId: e.target.value })}
              >
                <option value="">Chamado interno</option>
                {d.accounts
                  .filter((a) => a.status !== "cancelada")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Categoria">
              {(id) => (
                <Select
                  id={id}
                  value={f.category}
                  onChange={(e) => setF({ ...f, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Prioridade">
              {(id) => (
                <Select
                  id={id}
                  value={f.priority}
                  onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </Select>
              )}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Btn>
            <Btn type="submit">Abrir chamado</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
