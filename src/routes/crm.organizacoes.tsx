import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRightLeft, Building, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCrm } from "@/components/tipe/crm/context";
import { Btn, dateBR, Field, PageHeader, Pill, TextInput } from "@/components/tipe/crm/ui";
import { usage } from "@/lib/tipe/crm/engine";
import { PLANS, ROLE_LABEL } from "@/lib/tipe/crm/permissions";

export const Route = createFileRoute("/crm/organizacoes")({
  validateSearch: z.object({ nova: z.coerce.number().optional().catch(undefined) }),
  component: Organizacoes,
});

const SUB_LABEL = {
  teste: "Em teste",
  ativa: "Ativa",
  em_atraso: "Em atraso",
  cancelada: "Cancelada",
} as const;

function Organizacoes() {
  const { nova } = Route.useSearch();
  const navigate = useNavigate();
  const { s, org, orgs, run } = useCrm();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (nova) {
      setOpen(true);
      navigate({ to: "/crm/organizacoes", search: {}, replace: true });
    }
  }, [nova, navigate]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Organizações"
        description="Cada organização tem dados, equipe, plano e permissões separados. Trocar de organização troca tudo o que você vê."
        actions={
          <Btn onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Criar organização
          </Btn>
        }
      />
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orgs.map(({ org: o, role }) => {
          const sub = s.subscriptions.find((x) => x.orgId === o.id);
          const u = usage(s, o.id);
          const current = o.id === org.id;
          return (
            <li
              key={o.id}
              className={`crm-panel flex flex-col gap-3 p-4 ${current ? "ring-1 ring-primary/60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                  <Building className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold">{o.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.segment} · criada em {dateBR(o.createdAt)}
                  </p>
                </div>
                {current && <Pill tone="primary">Atual</Pill>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill>{ROLE_LABEL[role]}</Pill>
                {sub && (
                  <Pill
                    tone={
                      sub.status === "ativa"
                        ? "success"
                        : sub.status === "teste"
                          ? "info"
                          : "warning"
                    }
                  >
                    {PLANS[sub.planId].name} · {SUB_LABEL[sub.status]}
                  </Pill>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted/40 py-2">
                  <dt className="text-muted-foreground">Pessoas</dt>
                  <dd className="font-display text-base font-semibold">{u.users}</dd>
                </div>
                <div className="rounded-lg bg-muted/40 py-2">
                  <dt className="text-muted-foreground">Contatos</dt>
                  <dd className="font-display text-base font-semibold">{u.contacts}</dd>
                </div>
                <div className="rounded-lg bg-muted/40 py-2">
                  <dt className="text-muted-foreground">Funis</dt>
                  <dd className="font-display text-base font-semibold">{u.pipelines}</dd>
                </div>
              </dl>
              {!current && (
                <Btn
                  variant="outline"
                  className="mt-auto"
                  onClick={() => {
                    if (run({ type: "switchOrg", orgId: o.id }, `Agora em ${o.name}`).ok)
                      navigate({ to: "/crm" });
                  }}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Entrar em {o.name}
                </Btn>
              )}
            </li>
          );
        })}
      </ul>
      <CreateOrg open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateOrg({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run } = useCrm();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [touched, setTouched] = useState(false);
  const err = name.trim().length < 3 ? "Use pelo menos 3 letras." : undefined;
  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (err) return;
    if (run({ type: "createOrg", name, segment }).ok) {
      onOpenChange(false);
      setName("");
      setSegment("");
      setTouched(false);
      navigate({ to: "/crm" });
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Criar organização</DialogTitle>
          <DialogDescription className="text-xs">
            Você vira proprietário, com funil padrão e 14 dias de teste no plano Starter.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <Field label="Nome da organização" error={touched ? err : undefined}>
            {(id, dd) => (
              <TextInput
                id={id}
                autoFocus
                aria-describedby={dd}
                value={name}
                onBlur={() => setTouched(true)}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field label="Segmento" hint="Opcional. Ex.: Restaurantes, Bares, Franquias.">
            {(id, dd) => (
              <TextInput
                id={id}
                aria-describedby={dd}
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Btn>
            <Btn type="submit">Criar organização</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
