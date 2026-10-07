import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Instagram, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitLead, submitLeadDetails } from "@/lib/tipe/leads.functions";
import { getAttribution, trackLead } from "@/lib/tipe/tracking";
import { whatsappLink } from "@/lib/tipe/contact";
import { CLOSE_TIMES, PAGARME, PAINS, PEAKS, QUEUES, SOURCES, TABLES, TICKETS, VENUE, WAITERS } from "@/lib/tipe/leads-score";

const input = "w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Chips({ options, value, onChange, multi }: { options: Record<string, string>; value: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([k, l]) => {
        const on = value.includes(k);
        return (
          <button key={k} type="button" aria-pressed={on} onClick={() => onChange(multi ? (on ? value.filter((x) => x !== k) : [...value, k]) : on ? [] : [k])}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}>{l}</button>
        );
      })}
    </div>
  );
}
const PDV_OPTIONS = ["Saipos", "Consumer", "Goomer", "Colibri", "Linx", "TOTVS Chef", "iFood PDV", "Anota AI", "Não uso PDV"];
const MAQUININHA_OPTIONS = ["Stone", "Cielo", "Rede", "Getnet", "PagBank", "Mercado Pago", "SumUp", "InfinitePay", "Ton", "Safrapay"];

function ChoiceOther({ options, value, onChange, placeholder }: { options: string[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [other, setOther] = useState(value !== "" && !options.includes(value));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {[...options, "Outro"].map((o) => {
          const on = o === "Outro" ? other : !other && value === o;
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => { if (o === "Outro") { setOther(!on); onChange(""); } else { setOther(false); onChange(on ? "" : o); } }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}>{o}</button>
          );
        })}
      </div>
      {other && <input autoFocus maxLength={80} placeholder={placeholder} className={input} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

const Q = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2"><p className="text-sm font-semibold">{label}</p>{children}</div>
);

export function WaitlistForm({ origin = "home" }: { origin?: "home" | "simulador" | "calculadora" }) {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<{ leadId: string; token: string; refCode: string } | null>(null);
  const [f, setF] = useState({ contactName: "", phone: "", email: "", restaurantName: "", city: "", state: "CE", role: "", privacy: false, marketing: false });
  const [d, setD] = useState({ neighborhood: "", instagram: "", venueType: [] as string[], tablesRange: [] as string[], waitersRange: [] as string[], peakTimes: [] as string[], ticketRange: [] as string[], closeTime: [] as string[], peakQueue: [] as string[], pains: [] as string[], pdvSystem: "", acquirer: "", hasPagarme: [] as string[], discoverySource: [] as string[], referrerName: "" });

  async function enviar1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (f.contactName.trim().split(/\s+/).length < 2) return setError("Informe nome e sobrenome.");
    if (!/^\(\d{2}\) 9\d{4}-\d{4}$/.test(f.phone)) return setError("Confira o WhatsApp: (DD) 9XXXX-XXXX.");
    if (!f.role) return setError("Escolha o seu cargo.");
    if (!d.tablesRange[0]) return setError("Informe o número de mesas.");
    if (d.pdvSystem.trim().length < 2) return setError("Informe qual PDV você usa.");
    if (d.acquirer.trim().length < 2) return setError("Informe qual maquininha você usa.");
    setSending(true);
    try {
      const a = getAttribution();
      const calc = a.calculator;
      const res = await submitLead({ data: {
        contactName: f.contactName.trim(), phone: f.phone, email: f.email.trim(), restaurantName: f.restaurantName.trim(), city: f.city.trim(), state: f.state,
        role: f.role as "dono", tablesRange: d.tablesRange[0] as "ate_10", pdvSystem: d.pdvSystem.trim(), acquirer: d.acquirer.trim(), privacyAccepted: true, marketingOptIn: f.marketing,
        utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign, utm_content: a.utm_content, utm_term: a.utm_term,
        ...(a.ref ? { ref: a.ref } : {}), originPage: calc && origin === "home" ? "calculadora" : origin, usedSimulator: !!a.usedSimulator, ...(calc ? { calculator: calc } : {}),
      } });
      setLead(res);
      trackLead();
      setEtapa(2);
    } catch {
      setError("Não foi possível enviar agora. Confira os dados e tente de novo.");
    } finally { setSending(false); }
  }

  async function enviar2(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setSending(true);
    const one = (v: string[]) => (v[0] ?? null) as never;
    try {
      await submitLeadDetails({ data: {
        leadId: lead.leadId, token: lead.token, neighborhood: d.neighborhood, instagram: d.instagram, venueType: one(d.venueType), tablesRange: one(d.tablesRange),
        waitersRange: one(d.waitersRange), peakTimes: d.peakTimes as never, ticketRange: one(d.ticketRange), closeTime: one(d.closeTime), peakQueue: one(d.peakQueue),
        pains: d.pains as never, pdvSystem: d.pdvSystem, acquirer: d.acquirer, hasPagarme: one(d.hasPagarme), discoverySource: one(d.discoverySource), referrerName: d.referrerName,
      } });
      setEtapa(3);
    } catch { toast.error("Não foi possível salvar agora. Você pode pular esta etapa."); }
    finally { setSending(false); }
  }

  if (etapa === 3 && lead) {
    const link = `https://tipe.digital/?ref=${lead.refCode}`;
    const msg = `Conhece a TIPE? O cliente paga a conta da mesa pelo celular, sem esperar a maquininha. Os primeiros restaurantes ganham 30 dias grátis: ${link}`;
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <p className="mt-4 font-display text-xl font-bold">Pronto! Seu restaurante está na lista.</p>
        <p className="mt-2 text-sm text-muted-foreground">Vamos te chamar no WhatsApp para agendar a demonstração.</p>
        <div className="mt-6 w-full rounded-2xl border bg-muted/40 p-4">
          <p className="text-sm font-semibold">Conhece outro dono de restaurante que vive esperando a maquininha?</p>
          <a href={whatsappLink(msg, "")} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" />Indicar pelo WhatsApp</a>
        </div>
        <a href="https://instagram.com/tipe.digital" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Instagram className="h-4 w-4" />Seguir a TIPE no Instagram</a>
      </div>
    );
  }

  if (etapa === 2) {
    const set = (k: keyof typeof d) => (v: string[]) => setD((p) => ({ ...p, [k]: v }));
    return (
      <form onSubmit={enviar2} className="space-y-4">
        <div>
          <p className="font-display text-lg font-bold">Conte um pouco do seu restaurante</p>
          <p className="text-xs text-muted-foreground">Leva 1 minuto. Sua vaga já está garantida.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input maxLength={80} placeholder="Bairro" className={input} value={d.neighborhood} onChange={(e) => setD({ ...d, neighborhood: e.target.value })} />
          <input maxLength={60} placeholder="Instagram do restaurante (@)" className={input} value={d.instagram} onChange={(e) => setD({ ...d, instagram: e.target.value })} />
        </div>
        <Q label="Tipo"><Chips options={VENUE} value={d.venueType} onChange={set("venueType")} /></Q>
        <Q label="Número de garçons"><Chips options={WAITERS} value={d.waitersRange} onChange={set("waitersRange")} /></Q>
        <Q label="Horários de maior movimento"><Chips multi options={PEAKS} value={d.peakTimes} onChange={set("peakTimes")} /></Q>
        <Q label="Ticket médio por pessoa"><Chips options={TICKETS} value={d.ticketRange} onChange={set("ticketRange")} /></Q>
        <Q label="Hoje, quanto tempo leva entre o cliente pedir a conta e liberar a mesa?"><Chips options={CLOSE_TIMES} value={d.closeTime} onChange={set("closeTime")} /></Q>
        <Q label="Tem fila de espera por mesa nos horários de pico?"><Chips options={QUEUES} value={d.peakQueue} onChange={set("peakQueue")} /></Q>
        <Q label="Maior dor hoje"><Chips multi options={PAINS} value={d.pains} onChange={set("pains")} /></Q>
        <Q label="Já tem conta no Pagar.me?"><Chips options={PAGARME} value={d.hasPagarme} onChange={set("hasPagarme")} /></Q>
        <Q label="Como conheceu a TIPE?"><Chips options={SOURCES} value={d.discoverySource} onChange={set("discoverySource")} /></Q>
        {d.discoverySource[0] === "indicacao" && <input maxLength={120} placeholder="Quem indicou?" className={input} value={d.referrerName} onChange={(e) => setD({ ...d, referrerName: e.target.value })} />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setEtapa(3)}>Pular por agora</Button>
          <Button disabled={sending} className="h-11 flex-1 rounded-full font-display font-semibold">{sending ? "Enviando..." : "Enviar"}</Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={enviar1} className="space-y-3">
      <p className="font-display text-lg font-bold">Garanta seus 30 dias grátis</p>
      <input required maxLength={120} autoComplete="name" placeholder="Nome completo" className={input} value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input required inputMode="tel" autoComplete="tel" placeholder="WhatsApp (DD) 9XXXX-XXXX" className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })} />
        <input required type="email" maxLength={200} autoComplete="email" placeholder="E-mail" className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <input required maxLength={120} placeholder="Nome do restaurante" className={input} value={f.restaurantName} onChange={(e) => setF({ ...f, restaurantName: e.target.value })} />
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <input required maxLength={80} placeholder="Cidade" className={input} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        <select aria-label="Estado" className={input} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
      </div>
      <select required aria-label="Cargo" className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
        <option value="">Seu cargo</option><option value="dono">Proprietário</option><option value="gerente">Gerente</option><option value="outro">Outro</option>
      </select>
      <Q label="Número de mesas *"><Chips options={TABLES} value={d.tablesRange} onChange={(v) => setD((p) => ({ ...p, tablesRange: v }))} /></Q>
      <Q label="Qual sistema (PDV) você usa hoje? *"><ChoiceOther options={PDV_OPTIONS} value={d.pdvSystem} onChange={(v) => setD((p) => ({ ...p, pdvSystem: v }))} placeholder="Qual sistema?" /></Q>
      <Q label="Qual maquininha você usa hoje? *"><ChoiceOther options={MAQUININHA_OPTIONS} value={d.acquirer} onChange={(v) => setD((p) => ({ ...p, acquirer: v }))} placeholder="Qual maquininha?" /></Q>
      <label className="flex items-start gap-2 text-xs"><input required type="checkbox" className="mt-0.5" checked={f.privacy} onChange={(e) => setF({ ...f, privacy: e.target.checked })} /><span>Li e aceito a <Link to="/legal/$livro" params={{ livro: "privacidade" }} target="_blank" className="underline">Política de Privacidade</Link></span></label>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} /><span>Quero receber novidades da TIPE pelo WhatsApp e e-mail</span></label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={sending || !f.privacy} className="h-11 w-full rounded-full font-display font-semibold">{sending ? "Enviando..." : "Garantir minha vaga"}</Button>
    </form>
  );
}
