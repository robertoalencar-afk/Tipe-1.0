import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Plus, ShieldCheck, UserMinus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import {
  Avatar,
  Btn,
  ConfirmAction,
  dateBR,
  Empty,
  Field,
  PageHeader,
  Panel,
  Pill,
  Select,
  TextInput,
} from "@/components/tipe/crm/ui";
import { usage } from "@/lib/tipe/crm/engine";
import { PLANS, ROLE_HINT, ROLE_LABEL, ROLES } from "@/lib/tipe/crm/permissions";
import type { Role } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/equipe")({ component: Equipe });

function Equipe() {
  const { s, org, me, role, members, can, run, user } = useCrm();
  const d = useOrgData();
  const [inviting, setInviting] = useState(false);
  const [newTeam, setNewTeam] = useState("");
  const [newDep, setNewDep] = useState("");
  const pending = d.invites.filter((i) => i.status === "pendente");
  const plan = d.subscription ? PLANS[d.subscription.planId] : undefined;
  const used = usage(s, org.id).users;
  const editRoles = can("members.role");
  const manageTeams = can("teams.manage");
  const roleChoices = ROLES.filter((r) => r !== "owner" || role === "owner");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipe"
        description="Quem participa desta organização, com que papel e em qual equipe."
        actions={
          can("members.invite") && (
            <Btn onClick={() => setInviting(true)}>
              <Plus className="h-4 w-4" />
              Convidar pessoa
            </Btn>
          )
        }
      />
      {plan && (
        <p className="text-xs text-muted-foreground">
          {used} de {plan.limits.users} usuários do plano {plan.name}, contando convites pendentes.
        </p>
      )}

      <Panel title="Pessoas" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {members.map(({ user: u, membership: m }) => {
            const self = u.id === me.id;
            const ownerLocked = m.role === "owner" && role !== "owner";
            return (
              <li
                key={m.id}
                className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={u.name} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.name}
                      {self && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email} · desde {dateBR(m.joinedAt)}
                    </p>
                  </div>
                </div>
                {editRoles && !self && !ownerLocked ? (
                  <Select
                    aria-label={`Papel de ${u.name}`}
                    className="h-8 text-xs"
                    value={m.role}
                    onChange={(e) =>
                      run(
                        { type: "changeRole", membershipId: m.id, role: e.target.value as Role },
                        `Papel de ${u.name.split(" ")[0]} atualizado`,
                      )
                    }
                  >
                    {roleChoices.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span title={ROLE_HINT[m.role]}>
                    <Pill tone={m.role === "owner" || m.role === "admin" ? "primary" : "neutral"}>
                      {ROLE_LABEL[m.role]}
                    </Pill>
                  </span>
                )}
                {manageTeams ? (
                  <Select
                    aria-label={`Equipe de ${u.name}`}
                    className="h-8 text-xs"
                    value={m.teamId ?? ""}
                    onChange={(e) =>
                      run(
                        {
                          type: "setMemberTeam",
                          membershipId: m.id,
                          teamId: e.target.value || undefined,
                          departmentId: m.departmentId,
                        },
                        "Equipe atualizada",
                      )
                    }
                  >
                    <option value="">Sem equipe</option>
                    {d.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {d.teams.find((t) => t.id === m.teamId)?.name ?? "Sem equipe"}
                  </span>
                )}
                <div className="flex justify-end">
                  {editRoles && !self && !ownerLocked && (
                    <ConfirmAction
                      title={`Remover ${u.name}?`}
                      description="A pessoa perde o acesso a esta organização na hora. Os registros que ela criou continuam com o histórico."
                      confirmLabel={`Remover ${u.name.split(" ")[0]}`}
                      onConfirm={() =>
                        run(
                          { type: "removeMember", membershipId: m.id },
                          `${u.name} removido da organização`,
                        )
                      }
                      trigger={
                        <Btn variant="ghost" aria-label={`Remover ${u.name}`}>
                          <UserMinus className="h-4 w-4" />
                          <span className="md:sr-only">Remover</span>
                        </Btn>
                      }
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        title="Convites pendentes"
        description="No modo demonstração nenhum e-mail sai daqui. Use Simular aceite para ver a pessoa entrando."
        bodyClassName="p-0"
      >
        {pending.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            Nenhum convite aguardando resposta.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {i.name} <span className="text-xs text-muted-foreground">{i.email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[i.role]} · convidado por {user(i.invitedBy)?.name.split(" ")[0]} em{" "}
                    {dateBR(i.createdAt)}
                  </p>
                </div>
                {can("members.invite") && (
                  <>
                    <Btn
                      variant="outline"
                      onClick={() => run({ type: "acceptInvite", inviteId: i.id })}
                    >
                      Simular aceite
                    </Btn>
                    <ConfirmAction
                      title="Revogar convite?"
                      description={`${i.email} não vai mais conseguir entrar com este convite.`}
                      confirmLabel="Revogar convite"
                      onConfirm={() =>
                        run({ type: "revokeInvite", inviteId: i.id }, "Convite revogado")
                      }
                      trigger={<Btn variant="ghost">Revogar</Btn>}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Equipes">
          {d.teams.length === 0 ? (
            <Empty
              icon={Users}
              title="Nenhuma equipe"
              text="Equipes agrupam pessoas para metas e relatórios."
            />
          ) : (
            <ul className="space-y-1.5">
              {d.teams.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {members.filter((x) => x.membership.teamId === t.id).length} pessoas
                  </span>
                </li>
              ))}
            </ul>
          )}
          {manageTeams && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (run({ type: "createTeam", name: newTeam }, "Equipe criada").ok) setNewTeam("");
              }}
            >
              <TextInput
                aria-label="Nome da nova equipe"
                placeholder="Nova equipe"
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
              />
              <Btn type="submit" variant="outline" disabled={!newTeam.trim()}>
                Criar equipe
              </Btn>
            </form>
          )}
        </Panel>
        <Panel title="Departamentos">
          {d.departments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum departamento ainda.</p>
          ) : (
            <ul className="space-y-1.5">
              {d.departments.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {members.filter((x) => x.membership.departmentId === t.id).length} pessoas
                  </span>
                </li>
              ))}
            </ul>
          )}
          {manageTeams && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (run({ type: "createDepartment", name: newDep }, "Departamento criado").ok)
                  setNewDep("");
              }}
            >
              <TextInput
                aria-label="Nome do novo departamento"
                placeholder="Novo departamento"
                value={newDep}
                onChange={(e) => setNewDep(e.target.value)}
              />
              <Btn type="submit" variant="outline" disabled={!newDep.trim()}>
                Criar departamento
              </Btn>
            </form>
          )}
        </Panel>
      </div>

      <Panel
        title="O que cada papel pode fazer"
        description="As mesmas regras valem na tela e na camada que grava os dados."
      >
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r} className="rounded-lg border border-border p-3">
              <dt className="flex items-center gap-1.5 text-sm font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                {ROLE_LABEL[r]}
              </dt>
              <dd className="mt-1 text-xs text-muted-foreground">{ROLE_HINT[r]}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <InviteDialog open={inviting} onOpenChange={setInviting} roleChoices={roleChoices} />
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  roleChoices,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roleChoices: Role[];
}) {
  const { run } = useCrm();
  const d = useOrgData();
  const blank = { name: "", email: "", role: "seller" as Role, teamId: "" };
  const [f, setF] = useState(blank);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});
  const errs = {
    name: f.name.trim().length < 2 ? "Informe o nome." : undefined,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())
      ? undefined
      : "Use um e-mail válido, como nome@empresa.com.",
  };
  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (errs.name || errs.email) return;
    if (
      run({
        type: "inviteMember",
        name: f.name,
        email: f.email,
        role: f.role,
        teamId: f.teamId || undefined,
      }).ok
    ) {
      onOpenChange(false);
      setF(blank);
      setTouched({});
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Convidar pessoa</DialogTitle>
          <DialogDescription className="text-xs">
            O convite conta no limite de usuários do plano até ser aceito ou revogado.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <Field label="Nome" error={touched.name ? errs.name : undefined}>
            {(id, dd) => (
              <TextInput
                id={id}
                autoFocus
                aria-describedby={dd}
                value={f.name}
                onBlur={() => setTouched({ ...touched, name: true })}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            )}
          </Field>
          <Field label="E-mail" error={touched.email ? errs.email : undefined}>
            {(id, dd) => (
              <TextInput
                id={id}
                type="email"
                aria-describedby={dd}
                value={f.email}
                onBlur={() => setTouched({ ...touched, email: true })}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Papel" hint={ROLE_HINT[f.role]}>
              {(id, dd) => (
                <Select
                  id={id}
                  aria-describedby={dd}
                  value={f.role}
                  onChange={(e) => setF({ ...f, role: e.target.value as Role })}
                >
                  {roleChoices.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Equipe">
              {(id) => (
                <Select
                  id={id}
                  value={f.teamId}
                  onChange={(e) => setF({ ...f, teamId: e.target.value })}
                >
                  <option value="">Sem equipe</option>
                  {d.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Btn>
            <Btn type="submit">Enviar convite</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
