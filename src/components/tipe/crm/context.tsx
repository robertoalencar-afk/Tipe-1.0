import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Command, Result } from "@/lib/tipe/crm/engine";
import { can as canRole, type Action } from "@/lib/tipe/crm/permissions";
import { runCommand } from "@/lib/tipe/crm/store";
import type { CrmState, ID, Membership, Org, Role, User } from "@/lib/tipe/crm/types";

export type CreateKind = "contact" | "company" | "lead" | "deal" | "task";
export type CreatePreset = { contactId?: ID | undefined; dealId?: ID | undefined; companyId?: ID | undefined; stageId?: ID | undefined; dueAt?: string | undefined };

type CrmCtx = {
  s: CrmState;
  me: User;
  org: Org;
  role: Role;
  membership: Membership;
  orgs: { org: Org; role: Role }[];
  members: { user: User; membership: Membership }[];
  user: (id?: ID) => User | undefined;
  can: (a: Action) => boolean;
  run: (cmd: Command, success?: string) => Result;
  openCreate: (kind: CreateKind, preset?: CreatePreset) => void;
  creating: { kind: CreateKind; preset?: CreatePreset | undefined } | null;
  closeCreate: () => void;
};

const Ctx = createContext<CrmCtx | null>(null);

export function CrmProvider({ s, children }: { s: CrmState; children: ReactNode }) {
  const [creating, setCreating] = useState<CrmCtx["creating"]>(null);
  const session = s.session!;
  const run = useCallback((cmd: Command, success?: string) => {
    const r = runCommand(cmd);
    if (!r.ok) toast.error(r.error);
    else if (r.message || success) toast.success(r.message ?? success);
    return r;
  }, []);
  const value = useMemo<CrmCtx | null>(() => {
    const me = s.users.find((u) => u.id === session.userId);
    const org = s.orgs.find((o) => o.id === session.orgId);
    const membership = s.memberships.find((m) => m.userId === session.userId && m.orgId === session.orgId && m.status === "ativo");
    if (!me || !org || !membership) return null;
    const usersById = new Map(s.users.map((u) => [u.id, u]));
    return {
      s, me, org, membership, role: membership.role,
      orgs: s.memberships.filter((m) => m.userId === me.id && m.status === "ativo").map((m) => ({ org: s.orgs.find((o) => o.id === m.orgId)!, role: m.role })).filter((x) => x.org),
      members: s.memberships.filter((m) => m.orgId === org.id && m.status === "ativo").map((m) => ({ membership: m, user: usersById.get(m.userId)! })).filter((x) => x.user),
      user: (id?: ID) => (id ? usersById.get(id) : undefined),
      can: (a: Action) => canRole(membership.role, a),
      run,
      creating,
      openCreate: (kind, preset) => setCreating({ kind, preset }),
      closeCreate: () => setCreating(null),
    };
  }, [s, session.userId, session.orgId, run, creating]);
  if (!value) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCrm() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrm fora do CrmProvider");
  return v;
}

/** Registros da organização atual: o único jeito de as telas lerem dados. */
export function useOrgData() {
  const { s, org } = useCrm();
  return useMemo(() => {
    const f = <T extends { orgId: ID }>(list: T[]) => list.filter((x) => x.orgId === org.id);
    return {
      contacts: f(s.contacts), companies: f(s.companies), leads: f(s.leads), deals: f(s.deals), pipelines: f(s.pipelines), tasks: f(s.tasks),
      notes: f(s.notes), activities: f(s.activities), conversations: f(s.conversations), messages: f(s.messages), quickReplies: f(s.quickReplies),
      tickets: f(s.tickets), goals: f(s.goals), xp: f(s.xp), challenges: f(s.challenges), invoices: f(s.invoices), waInstances: f(s.waInstances),
      waTemplates: f(s.waTemplates), waLogs: f(s.waLogs), teams: f(s.teams), departments: f(s.departments), invites: s.invites.filter((i) => i.orgId === org.id),
      subscription: s.subscriptions.find((x) => x.orgId === org.id),
    };
  }, [s, org.id]);
}

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="crm-panel mx-auto mt-10 max-w-md p-6 text-center">
      <p className="font-display text-base font-semibold">Sem acesso a {what}</p>
      <p className="mt-2 text-sm text-muted-foreground">Seu papel nesta organização não inclui esta área. Peça a um administrador para ajustar sua permissão em Equipe.</p>
    </div>
  );
}
