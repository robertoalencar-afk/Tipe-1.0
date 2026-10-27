import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Contact as ContactIcon, Plus } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { SOURCES } from "@/components/tipe/crm/forms";
import { Btn, Empty, PageHeader, Pill, relative, SearchInput, Select, UserChip } from "@/components/tipe/crm/ui";
import { CONTACT_STATUS as STATUS } from "@/components/tipe/crm/labels";

export const Route = createFileRoute("/crm/contatos/")({ component: Contatos });


function Contatos() {
  const { members, user, openCreate, can } = useCrm();
  const { contacts, companies } = useOrgData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [limit, setLimit] = useState(40);
  const company = (id?: string) => companies.find((c) => c.id === id);
  const tags = useMemo(() => [...new Set(contacts.flatMap((c) => c.tags))].sort(), [contacts]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return contacts
      .filter((c) => (!t || [c.name, c.email, c.phone, c.whatsapp, company(c.companyId)?.name].some((x) => x?.toLowerCase().includes(t))) && (!status || c.status === status) && (!owner || c.ownerId === owner) && (!source || c.source === source) && (!tag || c.tags.includes(tag)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [contacts, q, status, owner, source, tag]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = q || status || owner || source || tag;

  return (
    <div className="space-y-4">
      <PageHeader title="Contatos" description={`${contacts.length} pessoas de restaurantes, bares e parceiros.`} actions={can("contacts.write") && <Btn onClick={() => openCreate("contact")}><Plus className="h-4 w-4" />Novo contato</Btn>} />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(4,10rem)]">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por nome, empresa, e-mail ou telefone" />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option><option value="cliente">Clientes</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></Select>
        <Select aria-label="Responsável" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Todos os responsáveis</option>{members.map(({ user: u }) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
        <Select aria-label="Origem" value={source} onChange={(e) => setSource(e.target.value)}><option value="">Todas as origens</option>{SOURCES.map((x) => <option key={x}>{x}</option>)}</Select>
        <Select aria-label="Etiqueta" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas as etiquetas</option>{tags.map((x) => <option key={x}>{x}</option>)}</Select>
      </div>

      {rows.length === 0 ? (
        filtered ? <Empty icon={ContactIcon} title="Nenhum contato com esses filtros" text="Tente outro termo ou limpe os filtros." action={<Btn variant="outline" onClick={() => { setQ(""); setStatus(""); setOwner(""); setSource(""); setTag(""); }}>Limpar filtros</Btn>} />
          : <Empty icon={ContactIcon} title="Nenhum contato ainda" text="Cadastre o primeiro contato ou converta um lead." action={can("contacts.write") && <Btn onClick={() => openCreate("contact")}><Plus className="h-4 w-4" />Novo contato</Btn>} />
      ) : (<>
        <div className="crm-panel hidden overflow-hidden md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">Lista de contatos</caption>
            <thead className="border-b border-border bg-muted/40 text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2.5 font-semibold">Nome</th><th className="px-3 py-2.5 font-semibold">Empresa</th><th className="hidden px-3 py-2.5 font-semibold lg:table-cell">Contato</th><th className="hidden px-3 py-2.5 font-semibold xl:table-cell">Origem</th><th className="px-3 py-2.5 font-semibold">Responsável</th><th className="px-3 py-2.5 font-semibold">Status</th><th className="hidden px-3 py-2.5 font-semibold lg:table-cell">Atualizado</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.slice(0, limit).map((c) => (
                <tr key={c.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => navigate({ to: "/crm/contatos/$id", params: { id: c.id } })}>
                  <td className="px-4 py-2.5"><Link to="/crm/contatos/$id" params={{ id: c.id }} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>{c.name}</Link><div className="text-xs text-muted-foreground">{c.jobTitle || "Sem cargo"}{c.tags.length > 0 && ` · ${c.tags.join(", ")}`}</div></td>
                  <td className="px-3 py-2.5 text-xs">{company(c.companyId)?.name ?? <span className="text-muted-foreground">Sem empresa</span>}</td>
                  <td className="hidden px-3 py-2.5 text-xs lg:table-cell"><div>{c.email}</div><div className="text-muted-foreground">{c.whatsapp || c.phone}</div></td>
                  <td className="hidden px-3 py-2.5 text-xs text-muted-foreground xl:table-cell">{c.source}</td>
                  <td className="px-3 py-2.5"><UserChip user={user(c.ownerId)} /></td>
                  <td className="px-3 py-2.5"><Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill></td>
                  <td className="hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">{relative(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 md:hidden">
          {rows.slice(0, limit).map((c) => (
            <li key={c.id}><Link to="/crm/contatos/$id" params={{ id: c.id }} className="crm-panel block p-3">
              <div className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted-foreground">{company(c.companyId)?.name ?? "Sem empresa"} · {c.jobTitle}</span></span><Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill></div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{c.whatsapp || c.email}</span><UserChip user={user(c.ownerId)} /></div>
            </Link></li>
          ))}
        </ul>
        {rows.length > limit && <div className="text-center"><Btn variant="outline" onClick={() => setLimit((l) => l + 40)}>Mostrar mais {Math.min(40, rows.length - limit)} de {rows.length - limit}</Btn></div>}
        <p className="text-xs text-muted-foreground">{rows.length} de {contacts.length} contatos</p>
      </>)}
    </div>
  );
}
