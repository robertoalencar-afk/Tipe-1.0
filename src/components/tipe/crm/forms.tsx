import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CLOSE_TIMES,
  PAGARME,
  QUEUES,
  ROLE_LABEL as LEAD_ROLE,
  TABLES,
} from "@/lib/tipe/leads-score";
import type {
  Company,
  Contact,
  Deal,
  ID,
  Lead,
  Priority,
  Task,
  TaskType,
} from "@/lib/tipe/crm/types";
import { useCrm, useOrgData, type CreatePreset } from "./context";
import { Btn, Field, Select, TextArea, TextInput } from "./ui";

// Formulários do CRM. Validam ao sair do campo e no envio; o motor valida de novo
// (é ele quem manda) e qualquer recusa aparece no topo do formulário.

export const SOURCES = [
  "Lista de espera",
  "Indicação",
  "Instagram",
  "Visita da equipe",
  "Evento",
  "WhatsApp",
  "Google",
  "Manual",
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneOk = (v: string) =>
  !v.trim() || (v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 13);

type Rules<T> = Partial<Record<keyof T, (v: T) => string | undefined>>;

function useForm<T extends Record<string, unknown>>(initial: T, rules: Rules<T>) {
  const [v, setV] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const errors = useMemo(() => {
    const e: Partial<Record<keyof T, string>> = {};
    for (const k of Object.keys(rules) as (keyof T)[]) {
      const msg = rules[k]!(v);
      if (msg) e[k] = msg;
    }
    return e;
  }, [v, rules]);
  const show = (k: keyof T) => (touched[k] || submitted ? errors[k] : undefined);
  const bind = (k: keyof T) => ({
    value: String(v[k] ?? ""),
    onChange: (e: { target: { value: string } }) => {
      setV((cur) => ({ ...cur, [k]: e.target.value }));
      setServerError(null);
    },
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    "aria-invalid": show(k) ? true : undefined,
  });
  return {
    v,
    setV,
    bind,
    show,
    valid: Object.keys(errors).length === 0,
    submit: () => setSubmitted(true),
    serverError,
    setServerError,
    reset: () => {
      setV(initial);
      setTouched({});
      setSubmitted(false);
      setServerError(null);
    },
  };
}

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  error,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  error?: string | null | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto rounded-xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-base">{title}</DialogTitle>
          {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
        </DialogHeader>
        <form noValidate onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          )}
          {children}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Btn>
            <Btn type="submit">{submitLabel}</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OwnerSelect({
  id,
  value,
  onChange,
  label = "Responsável",
}: {
  id: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  label?: string | undefined;
}) {
  const { members } = useCrm();
  return (
    <Select id={id} value={value} onChange={onChange} aria-label={label}>
      {members
        .filter((m) => m.membership.role !== "viewer")
        .map(({ user }) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
    </Select>
  );
}

// ---------- Contato ----------

type ContactForm = {
  name: string;
  companyId: string;
  jobTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
  source: string;
  ownerId: string;
  status: Contact["status"];
  tags: string;
  notes: string;
};
const contactRules: Rules<ContactForm> = {
  name: (v) => (v.name.trim().length < 2 ? "Informe o nome do contato." : undefined),
  email: (v) =>
    v.email.trim() && !EMAIL.test(v.email.trim())
      ? "Confira o e-mail, ele parece incompleto."
      : !v.email.trim() && !v.phone.trim() && !v.whatsapp.trim()
        ? "Informe e-mail, telefone ou WhatsApp."
        : undefined,
  phone: (v) => (phoneOk(v.phone) ? undefined : "Use DDD e número, por exemplo (85) 90000-0000."),
  whatsapp: (v) =>
    phoneOk(v.whatsapp) ? undefined : "Use DDD e número, por exemplo (85) 90000-0000.",
};

export function ContactDialog({
  open,
  onOpenChange,
  editing,
  preset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Contact | undefined;
  preset?: CreatePreset | undefined;
  onSaved?: (id: ID) => void;
}) {
  const { me, run } = useCrm();
  const { companies } = useOrgData();
  const init: ContactForm = editing
    ? {
        name: editing.name,
        companyId: editing.companyId ?? "",
        jobTitle: editing.jobTitle,
        email: editing.email,
        phone: editing.phone,
        whatsapp: editing.whatsapp,
        source: editing.source,
        ownerId: editing.ownerId,
        status: editing.status,
        tags: editing.tags.join(", "),
        notes: editing.notes,
      }
    : {
        name: "",
        companyId: preset?.companyId ?? "",
        jobTitle: "",
        email: "",
        phone: "",
        whatsapp: "",
        source: "Manual",
        ownerId: me.id,
        status: "ativo",
        tags: "",
        notes: "",
      };
  const f = useForm(init, contactRules);
  useEffect(() => {
    if (open) f.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e: FormEvent) {
    e.preventDefault();
    f.submit();
    if (!f.valid) return;
    const data = {
      ...f.v,
      companyId: f.v.companyId || undefined,
      tags: f.v.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const r = editing
      ? run({ type: "updateContact", id: editing.id, data }, "Contato salvo")
      : run({ type: "createContact", data }, "Contato criado");
    if (!r.ok) return f.setServerError(r.error);
    onOpenChange(false);
    onSaved?.(r.id ?? editing!.id);
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar contato" : "Novo contato"}
      description="Dados de quem decide ou opera no restaurante."
      onSubmit={submit}
      submitLabel={editing ? "Salvar contato" : "Criar contato"}
      error={f.serverError}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" error={f.show("name")} className="sm:col-span-2">
          {(id, d) => (
            <TextInput
              id={id}
              aria-describedby={d}
              autoFocus
              autoComplete="off"
              {...f.bind("name")}
            />
          )}
        </Field>
        <Field label="Empresa">
          {(id) => (
            <Select id={id} {...f.bind("companyId")}>
              <option value="">Sem empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Cargo">{(id) => <TextInput id={id} {...f.bind("jobTitle")} />}</Field>
        <Field label="E-mail" error={f.show("email")}>
          {(id, d) => (
            <TextInput
              id={id}
              type="email"
              inputMode="email"
              aria-describedby={d}
              {...f.bind("email")}
            />
          )}
        </Field>
        <Field label="Telefone" error={f.show("phone")}>
          {(id, d) => (
            <TextInput
              id={id}
              type="tel"
              inputMode="tel"
              placeholder="(85) 90000-0000"
              aria-describedby={d}
              {...f.bind("phone")}
            />
          )}
        </Field>
        <Field label="WhatsApp" error={f.show("whatsapp")}>
          {(id, d) => (
            <TextInput
              id={id}
              type="tel"
              inputMode="tel"
              placeholder="(85) 90000-0000"
              aria-describedby={d}
              {...f.bind("whatsapp")}
            />
          )}
        </Field>
        <Field label="Origem">
          {(id) => (
            <Select id={id} {...f.bind("source")}>
              {SOURCES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Responsável">{(id) => <OwnerSelect id={id} {...f.bind("ownerId")} />}</Field>
        <Field label="Status">
          {(id) => (
            <Select id={id} {...f.bind("status")}>
              <option value="ativo">Ativo</option>
              <option value="cliente">Cliente</option>
              <option value="inativo">Inativo</option>
            </Select>
          )}
        </Field>
        <Field label="Etiquetas" hint="Separe por vírgula" className="sm:col-span-2">
          {(id, d) => (
            <TextInput
              id={id}
              aria-describedby={d}
              placeholder="Decisor, Grupo com 2 casas"
              {...f.bind("tags")}
            />
          )}
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          {(id) => <TextArea id={id} {...f.bind("notes")} />}
        </Field>
      </div>
    </FormDialog>
  );
}

// ---------- Empresa ----------

type CompanyForm = {
  name: string;
  segment: string;
  city: string;
  neighborhood: string;
  size: string;
  pdv: string;
  ownerId: string;
};
const companyRules: Rules<CompanyForm> = {
  name: (v) => (v.name.trim().length < 2 ? "Informe o nome da empresa." : undefined),
};

export function CompanyDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Company | undefined;
}) {
  const { me, run } = useCrm();
  const init: CompanyForm = editing
    ? {
        name: editing.name,
        segment: editing.segment,
        city: editing.city,
        neighborhood: editing.neighborhood,
        size: editing.size,
        pdv: editing.pdv,
        ownerId: editing.ownerId,
      }
    : {
        name: "",
        segment: "Restaurante",
        city: "Fortaleza",
        neighborhood: "",
        size: "11 a 20 mesas",
        pdv: "",
        ownerId: me.id,
      };
  const f = useForm(init, companyRules);
  useEffect(() => {
    if (open) f.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e: FormEvent) {
    e.preventDefault();
    f.submit();
    if (!f.valid) return;
    const r = editing
      ? run({ type: "updateCompany", id: editing.id, data: f.v }, "Empresa salva")
      : run({ type: "createCompany", data: { ...f.v, tags: [] } }, "Empresa criada");
    if (!r.ok) return f.setServerError(r.error);
    onOpenChange(false);
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar empresa" : "Nova empresa"}
      onSubmit={submit}
      submitLabel={editing ? "Salvar empresa" : "Criar empresa"}
      error={f.serverError}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome fantasia" error={f.show("name")} className="sm:col-span-2">
          {(id, d) => <TextInput id={id} autoFocus aria-describedby={d} {...f.bind("name")} />}
        </Field>
        <Field label="Segmento">
          {(id) => (
            <Select id={id} {...f.bind("segment")}>
              {[
                "Restaurante",
                "Bar",
                "Cafeteria",
                "Barraca de praia",
                "Hamburgueria",
                "Pizzaria",
                "Outro",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Porte">
          {(id) => (
            <Select id={id} {...f.bind("size")}>
              {["Até 10 mesas", "11 a 20 mesas", "21 a 40 mesas", "Mais de 40 mesas"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Cidade">{(id) => <TextInput id={id} {...f.bind("city")} />}</Field>
        <Field label="Bairro">{(id) => <TextInput id={id} {...f.bind("neighborhood")} />}</Field>
        <Field label="PDV usado hoje">
          {(id) => <TextInput id={id} placeholder="Colibri, Saipos…" {...f.bind("pdv")} />}
        </Field>
        <Field label="Responsável">{(id) => <OwnerSelect id={id} {...f.bind("ownerId")} />}</Field>
      </div>
    </FormDialog>
  );
}

// ---------- Lead ----------

type LeadForm = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  source: string;
  ownerId: string;
  tables_range: string;
  pdv_system: string;
  peak_queue: string;
  close_time: string;
  contact_role: string;
  has_pagarme: string;
};
const leadRules: Rules<LeadForm> = {
  name: (v) => (v.name.trim().length < 2 ? "Informe o nome do lead." : undefined),
  email: (v) =>
    v.email.trim() && !EMAIL.test(v.email.trim())
      ? "Confira o e-mail, ele parece incompleto."
      : !v.email.trim() && !v.phone.trim()
        ? "Informe e-mail ou telefone."
        : undefined,
  phone: (v) => (phoneOk(v.phone) ? undefined : "Use DDD e número."),
};

export function LeadDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Lead | undefined;
}) {
  const { me, run } = useCrm();
  const p = editing?.profile ?? {};
  const init: LeadForm = {
    name: editing?.name ?? "",
    companyName: editing?.companyName ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    source: editing?.source ?? "Lista de espera",
    ownerId: editing?.ownerId ?? me.id,
    tables_range: p.tables_range ?? "",
    pdv_system: p.pdv_system ?? "",
    peak_queue: p.peak_queue ?? "",
    close_time: p.close_time ?? "",
    contact_role: p.contact_role ?? "",
    has_pagarme: p.has_pagarme ?? "",
  };
  const f = useForm(init, leadRules);
  useEffect(() => {
    if (open) f.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e: FormEvent) {
    e.preventDefault();
    f.submit();
    if (!f.valid) return;
    const { tables_range, pdv_system, peak_queue, close_time, contact_role, has_pagarme, ...rest } =
      f.v;
    const profile = Object.fromEntries(
      Object.entries({
        tables_range,
        pdv_system,
        peak_queue,
        close_time,
        contact_role,
        has_pagarme,
        city: p.city ?? "Fortaleza",
      }).filter(([, x]) => x),
    );
    const r = editing
      ? run({ type: "updateLead", id: editing.id, data: { ...rest, profile } }, "Lead salvo")
      : run({ type: "createLead", data: { ...rest, profile } }, "Lead criado");
    if (!r.ok) return f.setServerError(r.error);
    onOpenChange(false);
  }
  const opt = (rec: Record<string, string>) => [
    <option key="" value="">
      Não informado
    </option>,
    ...Object.entries(rec).map(([k, l]) => (
      <option key={k} value={k}>
        {l}
      </option>
    )),
  ];
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar lead" : "Novo lead"}
      description="Os campos do perfil são os mesmos da lista de espera da landing e alimentam a pontuação."
      onSubmit={submit}
      submitLabel={editing ? "Salvar lead" : "Criar lead"}
      error={f.serverError}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" error={f.show("name")}>
          {(id, d) => <TextInput id={id} autoFocus aria-describedby={d} {...f.bind("name")} />}
        </Field>
        <Field label="Restaurante">
          {(id) => <TextInput id={id} {...f.bind("companyName")} />}
        </Field>
        <Field label="E-mail" error={f.show("email")}>
          {(id, d) => <TextInput id={id} type="email" aria-describedby={d} {...f.bind("email")} />}
        </Field>
        <Field label="Telefone" error={f.show("phone")}>
          {(id, d) => (
            <TextInput
              id={id}
              type="tel"
              placeholder="(85) 90000-0000"
              aria-describedby={d}
              {...f.bind("phone")}
            />
          )}
        </Field>
        <Field label="Origem">
          {(id) => (
            <Select id={id} {...f.bind("source")}>
              {SOURCES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Responsável">{(id) => <OwnerSelect id={id} {...f.bind("ownerId")} />}</Field>
      </div>
      <fieldset className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold text-primary">Perfil do restaurante</legend>
        <Field label="Mesas">
          {(id) => (
            <Select id={id} {...f.bind("tables_range")}>
              {opt(TABLES)}
            </Select>
          )}
        </Field>
        <Field label="PDV">
          {(id) => <TextInput id={id} placeholder="Colibri, Saipos…" {...f.bind("pdv_system")} />}
        </Field>
        <Field label="Fila para pagar no pico">
          {(id) => (
            <Select id={id} {...f.bind("peak_queue")}>
              {opt(QUEUES)}
            </Select>
          )}
        </Field>
        <Field label="Tempo para fechar a conta">
          {(id) => (
            <Select id={id} {...f.bind("close_time")}>
              {opt(CLOSE_TIMES)}
            </Select>
          )}
        </Field>
        <Field label="Quem é o contato">
          {(id) => (
            <Select id={id} {...f.bind("contact_role")}>
              {opt(LEAD_ROLE)}
            </Select>
          )}
        </Field>
        <Field label="Já tem Pagar.me">
          {(id) => (
            <Select id={id} {...f.bind("has_pagarme")}>
              {opt(PAGARME)}
            </Select>
          )}
        </Field>
      </fieldset>
    </FormDialog>
  );
}

// ---------- Oportunidade ----------

type DealForm = {
  title: string;
  contactId: string;
  value: string;
  ownerId: string;
  probability: string;
  priority: Priority;
  expectedClose: string;
  pipelineId: string;
  stageId: string;
};
const dealRules: Rules<DealForm> = {
  title: (v) => (v.title.trim().length < 3 ? "Dê um título com pelo menos 3 letras." : undefined),
  contactId: (v) => (!v.contactId ? "Escolha o cliente." : undefined),
  value: (v) => (!(Number(v.value) > 0) ? "Informe um valor maior que zero." : undefined),
  probability: (v) =>
    Number(v.probability) < 0 || Number(v.probability) > 100 || v.probability === ""
      ? "Use de 0 a 100."
      : undefined,
};

export function DealDialog({
  open,
  onOpenChange,
  editing,
  preset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Deal | undefined;
  preset?: CreatePreset | undefined;
}) {
  const { me, run, can } = useCrm();
  const { contacts, pipelines } = useOrgData();
  const pipe = pipelines.find((p) => p.id === editing?.pipelineId) ?? pipelines[0];
  const firstOpen =
    pipe?.stages.find((s) => s.id === preset?.stageId && s.kind === "aberta") ??
    pipe?.stages.find((s) => s.kind === "aberta");
  const contact = contacts.find((c) => c.id === (editing?.contactId ?? preset?.contactId));
  const init: DealForm = editing
    ? {
        title: editing.title,
        contactId: editing.contactId,
        value: String(editing.value),
        ownerId: editing.ownerId,
        probability: String(editing.probability),
        priority: editing.priority,
        expectedClose: editing.expectedClose.slice(0, 10),
        pipelineId: editing.pipelineId,
        stageId: editing.stageId,
      }
    : {
        title: contact ? `${contact.name}: assinatura Tipe` : "",
        contactId: contact?.id ?? "",
        value: "",
        ownerId: me.id,
        probability: String(firstOpen?.probability ?? 10),
        priority: "media",
        expectedClose: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        pipelineId: pipe?.id ?? "",
        stageId: firstOpen?.id ?? "",
      };
  const f = useForm(init, dealRules);
  useEffect(() => {
    if (open) f.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const stages =
    pipelines.find((p) => p.id === f.v.pipelineId)?.stages.filter((s) => s.kind === "aberta") ?? [];
  function submit(e: FormEvent) {
    e.preventDefault();
    f.submit();
    if (!f.valid) return;
    const c = contacts.find((x) => x.id === f.v.contactId);
    const data = {
      title: f.v.title,
      contactId: f.v.contactId,
      companyId: c?.companyId,
      value: Number(f.v.value),
      ownerId: f.v.ownerId,
      probability: Number(f.v.probability),
      priority: f.v.priority,
      expectedClose: new Date(`${f.v.expectedClose}T12:00:00`).toISOString(),
      pipelineId: f.v.pipelineId,
      stageId: f.v.stageId,
    };
    const r = editing
      ? run(
          {
            type: "updateDeal",
            id: editing.id,
            data: (({ stageId: _s, pipelineId: _p, ...rest }) => rest)(data),
          },
          "Oportunidade salva",
        )
      : run({ type: "createDeal", data }, "Oportunidade criada");
    if (!r.ok) return f.setServerError(r.error);
    onOpenChange(false);
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar oportunidade" : "Nova oportunidade"}
      description="O valor é o contrato anual estimado. A probabilidade alimenta a receita projetada do painel."
      onSubmit={submit}
      submitLabel={editing ? "Salvar oportunidade" : "Criar oportunidade"}
      error={f.serverError}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Título" error={f.show("title")} className="sm:col-span-2">
          {(id, d) => <TextInput id={id} autoFocus aria-describedby={d} {...f.bind("title")} />}
        </Field>
        <Field label="Cliente" error={f.show("contactId")}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...f.bind("contactId")}>
              <option value="">Escolha um contato</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Valor anual (R$)" error={f.show("value")}>
          {(id, d) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              step={100}
              inputMode="decimal"
              aria-describedby={d}
              {...f.bind("value")}
            />
          )}
        </Field>
        <Field label="Responsável">
          {(id) =>
            can("deals.write_any") ? (
              <OwnerSelect id={id} {...f.bind("ownerId")} />
            ) : (
              <TextInput id={id} disabled value={me.name} />
            )
          }
        </Field>
        <Field label="Probabilidade (%)" error={f.show("probability")}>
          {(id, d) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              max={100}
              aria-describedby={d}
              {...f.bind("probability")}
            />
          )}
        </Field>
        <Field label="Prioridade">
          {(id) => (
            <Select id={id} {...f.bind("priority")}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </Select>
          )}
        </Field>
        <Field label="Previsão de fechamento">
          {(id) => <TextInput id={id} type="date" {...f.bind("expectedClose")} />}
        </Field>
        {!editing && (
          <Field label="Funil">
            {(id) => (
              <Select
                id={id}
                value={f.v.pipelineId}
                onChange={(e) => {
                  const p = pipelines.find((x) => x.id === e.target.value);
                  const st = p?.stages.find((s) => s.kind === "aberta");
                  f.setV({
                    ...f.v,
                    pipelineId: e.target.value,
                    stageId: st?.id ?? "",
                    probability: String(st?.probability ?? 10),
                  });
                }}
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {!editing && (
          <Field label="Etapa">
            {(id) => (
              <Select
                id={id}
                value={f.v.stageId}
                onChange={(e) => {
                  const st = stages.find((s) => s.id === e.target.value);
                  f.setV({
                    ...f.v,
                    stageId: e.target.value,
                    probability: String(st?.probability ?? f.v.probability),
                  });
                }}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>
    </FormDialog>
  );
}

// ---------- Tarefa ----------

type TaskForm = {
  title: string;
  type: TaskType;
  assigneeId: string;
  priority: Priority;
  dueAt: string;
  contactId: string;
  dealId: string;
  description: string;
};
const taskRules: Rules<TaskForm> = {
  title: (v) =>
    v.title.trim().length < 3 ? "Descreva a tarefa em pelo menos 3 letras." : undefined,
  dueAt: (v) => (!v.dueAt ? "Escolha o prazo." : undefined),
};
const localInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function TaskDialog({
  open,
  onOpenChange,
  editing,
  preset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Task | undefined;
  preset?: CreatePreset | undefined;
}) {
  const { me, run, can } = useCrm();
  const { contacts, deals } = useOrgData();
  const deal = deals.find((d) => d.id === preset?.dealId);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const init: TaskForm = editing
    ? {
        title: editing.title,
        type: editing.type,
        assigneeId: editing.assigneeId,
        priority: editing.priority,
        dueAt: localInput(editing.dueAt),
        contactId: editing.contactId ?? "",
        dealId: editing.dealId ?? "",
        description: editing.description,
      }
    : {
        title: "",
        type: "tarefa",
        assigneeId: me.id,
        priority: "media",
        dueAt: localInput(preset?.dueAt ?? tomorrow.toISOString()),
        contactId: preset?.contactId ?? deal?.contactId ?? "",
        dealId: preset?.dealId ?? "",
        description: "",
      };
  const f = useForm(init, taskRules);
  useEffect(() => {
    if (open) f.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(e: FormEvent) {
    e.preventDefault();
    f.submit();
    if (!f.valid) return;
    const data = {
      ...f.v,
      dueAt: new Date(f.v.dueAt).toISOString(),
      contactId: f.v.contactId || undefined,
      dealId: f.v.dealId || undefined,
    };
    const r = editing
      ? run({ type: "updateTask", id: editing.id, data }, "Tarefa salva")
      : run({ type: "createTask", data }, "Tarefa criada");
    if (!r.ok) return f.setServerError(r.error);
    onOpenChange(false);
  }
  const dealsForContact = deals.filter(
    (d) => d.status === "aberta" && (!f.v.contactId || d.contactId === f.v.contactId),
  );
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar tarefa" : "Nova tarefa"}
      onSubmit={submit}
      submitLabel={editing ? "Salvar tarefa" : "Criar tarefa"}
      error={f.serverError}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="O que fazer" error={f.show("title")} className="sm:col-span-2">
          {(id, d) => (
            <TextInput
              id={id}
              autoFocus
              aria-describedby={d}
              placeholder="Ligar para confirmar a demonstração"
              {...f.bind("title")}
            />
          )}
        </Field>
        <Field label="Tipo">
          {(id) => (
            <Select id={id} {...f.bind("type")}>
              <option value="tarefa">Tarefa</option>
              <option value="ligacao">Ligação</option>
              <option value="reuniao">Reunião</option>
              <option value="email">E-mail</option>
            </Select>
          )}
        </Field>
        <Field label="Prazo" error={f.show("dueAt")}>
          {(id, d) => (
            <TextInput id={id} type="datetime-local" aria-describedby={d} {...f.bind("dueAt")} />
          )}
        </Field>
        <Field
          label="Responsável"
          hint={can("tasks.assign_others") ? undefined : "Seu papel cria tarefas só para você."}
        >
          {(id, d) =>
            can("tasks.assign_others") ? (
              <OwnerSelect id={id} {...f.bind("assigneeId")} />
            ) : (
              <TextInput id={id} aria-describedby={d} disabled value={me.name} />
            )
          }
        </Field>
        <Field label="Prioridade">
          {(id) => (
            <Select id={id} {...f.bind("priority")}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </Select>
          )}
        </Field>
        <Field label="Contato">
          {(id) => (
            <Select
              id={id}
              value={f.v.contactId}
              onChange={(e) => f.setV({ ...f.v, contactId: e.target.value, dealId: "" })}
            >
              <option value="">Nenhum</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Oportunidade">
          {(id) => (
            <Select id={id} {...f.bind("dealId")}>
              <option value="">Nenhuma</option>
              {dealsForContact.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Detalhes" className="sm:col-span-2">
          {(id) => <TextArea id={id} {...f.bind("description")} />}
        </Field>
      </div>
    </FormDialog>
  );
}

/** Diálogo de criação rápida aberto pelo cabeçalho ou por qualquer tela. */
export function QuickCreate() {
  const { creating, closeCreate } = useCrm();
  const open = (k: string) => creating?.kind === k;
  const onOpenChange = (o: boolean) => {
    if (!o) closeCreate();
  };
  return (
    <>
      <ContactDialog open={open("contact")} onOpenChange={onOpenChange} preset={creating?.preset} />
      <CompanyDialog open={open("company")} onOpenChange={onOpenChange} />
      <LeadDialog open={open("lead")} onOpenChange={onOpenChange} />
      <DealDialog open={open("deal")} onOpenChange={onOpenChange} preset={creating?.preset} />
      <TaskDialog open={open("task")} onOpenChange={onOpenChange} preset={creating?.preset} />
    </>
  );
}
