/**
 * Formulário curto de interesse: "Quero ser avisado" do Tipe Guest e o cadastro do programa
 * Restaurante Fundador. Grava de verdade em restaurant_leads (submitInterestLead), com
 * consentimento LGPD desmarcado por padrão e finalidade escrita ao lado da caixa.
 * Sucesso só aparece quando o servidor responde ok.
 */
import { useId, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitInterestLead } from "@/lib/tipe/leads.functions";
import { FINALIDADE, type OrigemInteresse } from "@/lib/tipe/interest-lead";
import { getAttribution } from "@/lib/tipe/tracking";
import { cn } from "@/lib/utils";
import { SetaFios } from "./Bigode";

const campo =
  "mt-1.5 block min-h-12 w-full rounded-xl border border-[#021E34]/20 bg-white px-4 text-[1rem] text-[#021E34] outline-none placeholder:text-[#021E34]/40 focus:border-[#0FC9BD] focus:ring-2 focus:ring-[#0FC9BD]/40";
const rotulo = "block text-[0.95rem] font-medium text-[#021E34]";

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Estado = "parado" | "enviando" | "ok" | "erro";

export function FormularioInteresse({
  origem,
  className,
}: {
  origem: OrigemInteresse;
  className?: string;
}) {
  const id = useId();
  const fundador = origem === "restaurante-fundador";
  const [estado, setEstado] = useState<Estado>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState({
    nome: "",
    email: "",
    telefone: "",
    restaurante: "",
    cidade: "",
    consentimento: false,
    novidades: false,
    site: "",
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (f.nome.trim().length < 2) return setErro("Informe seu nome.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setErro("Confira o e-mail.");
    if (fundador && f.restaurante.trim().length < 2)
      return setErro("Informe o nome do restaurante.");
    if (fundador && !/^\(\d{2}\) 9\d{4}-\d{4}$/.test(f.telefone))
      return setErro("Confira o WhatsApp: (DD) 9XXXX-XXXX.");
    if (!f.consentimento) return setErro("Para continuar, marque a caixa de consentimento.");
    setEstado("enviando");
    try {
      const a = getAttribution();
      const r = await submitInterestLead({
        data: {
          origem,
          contactName: f.nome.trim(),
          email: f.email.trim(),
          ...(fundador ? { phone: f.telefone, restaurantName: f.restaurante.trim() } : {}),
          ...(f.cidade.trim() ? { city: f.cidade.trim() } : {}),
          privacyAccepted: true,
          marketingOptIn: f.novidades,
          ...(f.site ? { site: f.site } : {}),
          ...(a.utm_source ? { utm_source: a.utm_source } : {}),
          ...(a.utm_medium ? { utm_medium: a.utm_medium } : {}),
          ...(a.utm_campaign ? { utm_campaign: a.utm_campaign } : {}),
          ...(a.utm_content ? { utm_content: a.utm_content } : {}),
          ...(a.utm_term ? { utm_term: a.utm_term } : {}),
        },
      });
      if (!r?.ok) throw new Error("sem ok");
      setEstado("ok");
    } catch {
      setEstado("erro");
      setErro(
        "Não foi possível enviar agora. Seus dados continuam aqui; tente de novo em instantes.",
      );
    }
  }

  if (estado === "ok")
    return (
      <div
        role="status"
        className={cn("rounded-[1.75rem] bg-white p-7 text-[#021E34] sm:p-9", className)}
      >
        <CheckCircle2 className="h-10 w-10 text-[#0b9e94]" aria-hidden />
        <p className="mt-4 font-display text-[1.6rem] leading-tight tracking-[-0.03em]">
          {fundador ? "Recebemos o seu interesse." : "Pronto. Você será avisado."}
        </p>
        <p className="mt-2 text-[1rem] leading-relaxed text-[#021E34]/75">
          {fundador
            ? "A equipe da Tipe vai falar com você pelo WhatsApp ou e-mail informado."
            : "Quando o Tipe Guest chegar, a Tipe manda um e-mail para você. Só isso."}
        </p>
      </div>
    );

  const set = (k: keyof typeof f) => (v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-describedby={erro ? `${id}-erro` : undefined}
      className={cn("rounded-[1.75rem] bg-white p-6 text-[#021E34] sm:p-8", className)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={rotulo}>
          Seu nome
          <input
            className={campo}
            autoComplete="name"
            maxLength={120}
            value={f.nome}
            onChange={(e) => set("nome")(e.target.value)}
            required
          />
        </label>
        <label className={rotulo}>
          E-mail
          <input
            className={campo}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={200}
            value={f.email}
            onChange={(e) => set("email")(e.target.value)}
            required
          />
        </label>
        {fundador && (
          <>
            <label className={rotulo}>
              Restaurante
              <input
                className={campo}
                autoComplete="organization"
                maxLength={120}
                value={f.restaurante}
                onChange={(e) => set("restaurante")(e.target.value)}
                required
              />
            </label>
            <label className={rotulo}>
              WhatsApp
              <input
                className={campo}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(85) 9XXXX-XXXX"
                value={f.telefone}
                onChange={(e) => set("telefone")(mascaraTelefone(e.target.value))}
                required
              />
            </label>
          </>
        )}
        <label className={cn(rotulo, !fundador && "sm:col-span-2")}>
          Cidade <span className="font-normal text-[#021E34]/55">(opcional)</span>
          <input
            className={campo}
            autoComplete="address-level2"
            maxLength={80}
            value={f.cidade}
            onChange={(e) => set("cidade")(e.target.value)}
          />
        </label>
      </div>

      {/* Campo-isca: fora da tela e fora da ordem de tabulação. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input
            tabIndex={-1}
            autoComplete="off"
            value={f.site}
            onChange={(e) => set("site")(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-6 space-y-3">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.95rem] leading-snug">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#0b9e94]"
            checked={f.consentimento}
            onChange={(e) => set("consentimento")(e.target.checked)}
          />
          <span>
            Autorizo a Tipe a usar meus dados para esta finalidade: {FINALIDADE[origem]} Posso pedir
            a exclusão quando quiser. Veja a{" "}
            <a href="/legal/privacidade" className="font-medium underline underline-offset-2">
              Política de Privacidade
            </a>
            .
          </span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.95rem] leading-snug text-[#021E34]/80">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#0b9e94]"
            checked={f.novidades}
            onChange={(e) => set("novidades")(e.target.checked)}
          />
          <span>Também quero receber outras novidades da Tipe (opcional).</span>
        </label>
      </div>

      {erro && (
        <p
          id={`${id}-erro`}
          role="alert"
          className="mt-4 rounded-xl bg-[#fde8e6] px-4 py-3 text-[0.95rem] text-[#8a1c12]"
        >
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="com-fios mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#021E34] px-7 text-[1rem] font-medium text-white transition-opacity disabled:opacity-70 sm:w-auto"
      >
        {estado === "enviando" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
            Enviando…
          </>
        ) : (
          <>
            {fundador ? "Quero ser Restaurante Fundador" : "Quero ser avisado"}
            <SetaFios />
          </>
        )}
      </button>
    </form>
  );
}
