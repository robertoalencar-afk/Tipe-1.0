/**
 * Formulário compartilhado do Pay e Order, ligado ao CRM restaurant_leads.
 * Confirma apenas após resposta do servidor e reutiliza a chave em retries.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, MessageCircle, TriangleAlert } from "lucide-react";
import { submitLead } from "@/lib/tipe/leads.functions";
import { getAttribution, trackLead, trackProduto } from "@/lib/tipe/tracking";
import { whatsappLink } from "@/lib/tipe/contact";
import { TABLES } from "@/lib/tipe/leads-score";
import { TEXTOS_LANCAMENTO, type EstadoLancamento } from "@/lib/tipe/launch-state";
import { cn } from "@/lib/utils";

const UFS =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const PDVS = [
  "Saipos",
  "Consumer",
  "Goomer",
  "Colibri",
  "Linx",
  "TOTVS Chef",
  "iFood PDV",
  "Anota AI",
  "Não uso PDV",
];
const MAQUININHAS = [
  "Stone",
  "Cielo",
  "Rede",
  "Getnet",
  "PagBank",
  "Mercado Pago",
  "SumUp",
  "InfinitePay",
  "Ton",
  "Safrapay",
  "Não uso maquininha",
];
const OUTRO = "__outro";

function mascaraFone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Campos = {
  nome: string;
  fone: string;
  email: string;
  restaurante: string;
  cidade: string;
  uf: string;
  cargo: string;
  mesas: string;
  pdv: string;
  pdvOutro: string;
  maquininha: string;
  maquininhaOutro: string;
  privacidade: boolean;
  novidades: boolean;
};
type Erros = Partial<Record<keyof Campos, string>>;

function validar(f: Campos): Erros {
  const e: Erros = {};
  const nome = f.nome.trim();
  if (nome.length < 5 || nome.split(/\s+/).length < 2) e.nome = "Escreva nome e sobrenome.";
  if (!/^\(\d{2}\) 9\d{4}-\d{4}$/.test(f.fone)) e.fone = "Use o formato (DD) 9XXXX-XXXX.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Confira o e-mail.";
  if (f.restaurante.trim().length < 2) e.restaurante = "Escreva o nome do restaurante.";
  if (f.cidade.trim().length < 2) e.cidade = "Escreva a cidade.";
  if (!UFS.includes(f.uf)) e.uf = "Escolha o estado.";
  if (!f.cargo) e.cargo = "Escolha o seu cargo.";
  if (!f.mesas) e.mesas = "Escolha o número de mesas.";
  const pdv = f.pdv === OUTRO ? f.pdvOutro.trim() : f.pdv;
  if (f.pdv && pdv.length < 2)
    e.pdv = f.pdv === OUTRO ? "Escreva qual sistema." : "Escolha o sistema (PDV).";
  const maq = f.maquininha === OUTRO ? f.maquininhaOutro.trim() : f.maquininha;
  if (f.maquininha && maq.length < 2)
    e.maquininha = f.maquininha === OUTRO ? "Escreva qual maquininha." : "Escolha a maquininha.";
  if (!f.privacidade) e.privacidade = "Para enviar, aceite a Política de Privacidade.";
  return e;
}

const campo =
  "mt-1.5 block h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-[#0FC9BD] focus:ring-2 focus:ring-[#0FC9BD]/30 aria-[invalid=true]:border-destructive";

function Campo({
  id,
  rotulo,
  erro,
  children,
  className,
}: {
  id: string;
  rotulo: string;
  erro?: string | undefined;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="mt-1.5 text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}

export function LeadForm({
  estado = "piloto",
  produto = "pay",
  origin = "home",
  embedded = false,
}: {
  estado?: EstadoLancamento;
  produto?: "pay" | "order";
  origin?: "home" | "simulador" | "calculadora";
  embedded?: boolean;
}) {
  const t = TEXTOS_LANCAMENTO[estado];
  const order = produto === "order";
  const titulo = order ? t.tituloFormulario : "Solicite uma demonstração da Tipe";
  type SelectedPlan = "essencial" | "profissional" | "premium" | "personalizado";
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>();
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plano");
    if (plan && ["essencial", "profissional", "premium", "personalizado"].includes(plan))
      setSelectedPlan(plan as SelectedPlan);
  }, []);
  const requestKey = useRef<string | null>(null);
  const submitting = useRef(false);
  const [website, setWebsite] = useState("");
  const base = useId();
  const id = (k: string) => `${base}-${k}`;
  const formRef = useRef<HTMLFormElement>(null);
  const [f, setF] = useState<Campos>({
    nome: "",
    fone: "",
    email: "",
    restaurante: "",
    cidade: "",
    uf: "",
    cargo: "",
    mesas: "",
    pdv: "",
    pdvOutro: "",
    maquininha: "",
    maquininhaOutro: "",
    privacidade: false,
    novidades: false,
  });
  const [erros, setErros] = useState<Erros>({});
  const [tocados, setTocados] = useState<Partial<Record<keyof Campos, boolean>>>({});
  const [envio, setEnvio] = useState<"livre" | "enviando" | "ok" | "erro">("livre");

  const mudar = <K extends keyof Campos>(k: K, v: Campos[K]) => {
    const novo = { ...f, [k]: v };
    setF(novo);
    // O erro some assim que o campo fica certo; não aparece enquanto a pessoa digita.
    if (erros[k] && !validar(novo)[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };
  const sair = (k: keyof Campos) => {
    setTocados((x) => ({ ...x, [k]: true }));
    setErros((e) => ({ ...e, [k]: validar(f)[k] }));
  };
  const erroDe = (k: keyof Campos) => (tocados[k] ? erros[k] : undefined);
  const aria = (k: keyof Campos) => ({
    "aria-invalid": erroDe(k) ? true : undefined,
    "aria-describedby": erroDe(k) ? `${id(k)}-erro` : undefined,
  });

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (submitting.current) return;
    const e = validar(f);
    setErros(e);
    setTocados(Object.fromEntries(Object.keys(f).map((k) => [k, true])));
    const primeiro = Object.keys(e)[0];
    if (primeiro) {
      formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id(primeiro))}`)?.focus();
      return;
    }
    submitting.current = true;
    requestKey.current ??= crypto.randomUUID();
    setEnvio("enviando");
    try {
      const a = getAttribution();
      await submitLead({
        data: {
          selectedPlan,
          submissionKey: requestKey.current,
          website,
          contactName: f.nome.trim(),
          phone: f.fone,
          email: f.email.trim(),
          restaurantName: f.restaurante.trim(),
          city: f.cidade.trim(),
          state: f.uf,
          role: f.cargo as "dono",
          tablesRange: f.mesas as "ate_10",
          pdvSystem: f.pdv === OUTRO ? f.pdvOutro.trim() : f.pdv || "Não informado",
          acquirer:
            f.maquininha === OUTRO ? f.maquininhaOutro.trim() : f.maquininha || "Não informado",
          privacyAccepted: true,
          marketingOptIn: f.novidades,
          utm_source: a.utm_source,
          utm_medium: a.utm_medium,
          utm_campaign: a.utm_campaign,
          utm_content: a.utm_content,
          utm_term: a.utm_term,
          ...(a.ref ? { ref: a.ref } : {}),
          originPage: order
            ? "tipe-order"
            : a.calculator && origin === "home"
              ? "calculadora"
              : origin,
          ...(a.calculator ? { calculator: a.calculator } : {}),
          launchState: estado,
          usedSimulator: !!a.usedSimulator,
        },
      });
      setEnvio("ok");
      trackLead();
      trackProduto("produto_lead_ok", { produto, estado });
    } catch {
      setEnvio("erro");
      trackProduto("produto_lead_erro", { produto, estado });
    } finally {
      submitting.current = false;
    }
  }

  if (envio === "ok")
    return (
      <div role="status" className="rounded-[1.75rem] bg-background p-7 text-foreground sm:p-10">
        <CheckCircle2 className="h-10 w-10 text-[#03665f]" aria-hidden />
        <p className="mt-4 font-display text-[1.6rem] leading-tight tracking-[-0.03em]">
          Recebemos o seu contato.
        </p>
        <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
          A equipe da Tipe vai falar com você pelo WhatsApp{" "}
          {order ? "sobre o Tipe Order" : "para conhecer seu restaurante e agendar a demonstração"}.
          Seu contato foi registrado; o envio de e-mail pode levar alguns minutos.
        </p>
      </div>
    );

  const zap = whatsappLink(
    `Olá! Quero saber mais sobre ${order ? "o Tipe Order" : "a Tipe para meu restaurante"}.`,
  );
  return (
    <form
      ref={formRef}
      onSubmit={enviar}
      noValidate
      aria-label={titulo}
      aria-busy={envio === "enviando"}
      className={cn(
        "text-foreground",
        embedded ? "pt-5" : "rounded-[1.75rem] bg-background p-6 sm:p-9",
      )}
    >
      {selectedPlan && (
        <p className="mb-3 text-sm font-medium">
          Interesse no plano: {selectedPlan}. Você pode confirmar a escolha com a equipe.
        </p>
      )}
      <p className="mb-5 text-sm text-muted-foreground">
        Campos de contato e restaurante são obrigatórios. PDV, maquininha e novidades são opcionais.
        Enviar solicita um contato, sem contratar ou ativar cobranças.
      </p>
      <div aria-hidden="true" className="hidden">
        <label htmlFor={id("website")}>Website</label>
        <input
          id={id("website")}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <fieldset disabled={envio === "enviando"} className="grid gap-4 sm:grid-cols-2">
        <Campo
          id={id("nome")}
          rotulo="Nome e sobrenome"
          erro={erroDe("nome")}
          className="sm:col-span-2"
        >
          <input
            id={id("nome")}
            autoComplete="name"
            maxLength={120}
            className={campo}
            value={f.nome}
            onChange={(e) => mudar("nome", e.target.value)}
            onBlur={() => sair("nome")}
            {...aria("nome")}
          />
        </Campo>
        <Campo id={id("fone")} rotulo="WhatsApp" erro={erroDe("fone")}>
          <input
            id={id("fone")}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(DD) 9XXXX-XXXX"
            className={campo}
            value={f.fone}
            onChange={(e) => mudar("fone", mascaraFone(e.target.value))}
            onBlur={() => sair("fone")}
            {...aria("fone")}
          />
        </Campo>
        <Campo id={id("email")} rotulo="E-mail" erro={erroDe("email")}>
          <input
            id={id("email")}
            type="email"
            autoComplete="email"
            maxLength={200}
            className={campo}
            value={f.email}
            onChange={(e) => mudar("email", e.target.value)}
            onBlur={() => sair("email")}
            {...aria("email")}
          />
        </Campo>
        <Campo
          id={id("restaurante")}
          rotulo="Nome do restaurante"
          erro={erroDe("restaurante")}
          className="sm:col-span-2"
        >
          <input
            id={id("restaurante")}
            autoComplete="organization"
            maxLength={120}
            className={campo}
            value={f.restaurante}
            onChange={(e) => mudar("restaurante", e.target.value)}
            onBlur={() => sair("restaurante")}
            {...aria("restaurante")}
          />
        </Campo>
        <div className="grid grid-cols-[1fr_6.5rem] gap-4 sm:col-span-2">
          <Campo id={id("cidade")} rotulo="Cidade" erro={erroDe("cidade")}>
            <input
              id={id("cidade")}
              autoComplete="address-level2"
              maxLength={80}
              className={campo}
              value={f.cidade}
              onChange={(e) => mudar("cidade", e.target.value)}
              onBlur={() => sair("cidade")}
              {...aria("cidade")}
            />
          </Campo>
          <Campo id={id("uf")} rotulo="Estado" erro={erroDe("uf")}>
            <select
              id={id("uf")}
              className={campo}
              value={f.uf}
              onChange={(e) => mudar("uf", e.target.value)}
              onBlur={() => sair("uf")}
              autoComplete="address-level1"
              {...aria("uf")}
            >
              <option value="">Escolha</option>
              {UFS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo id={id("cargo")} rotulo="Seu cargo" erro={erroDe("cargo")}>
          <select
            id={id("cargo")}
            className={campo}
            value={f.cargo}
            onChange={(e) => mudar("cargo", e.target.value)}
            onBlur={() => sair("cargo")}
            {...aria("cargo")}
          >
            <option value="">Escolha</option>
            <option value="dono">Proprietário</option>
            <option value="gerente">Gerente</option>
            <option value="outro">Outro</option>
          </select>
        </Campo>
        <Campo id={id("mesas")} rotulo="Número de mesas" erro={erroDe("mesas")}>
          <select
            id={id("mesas")}
            className={campo}
            value={f.mesas}
            onChange={(e) => mudar("mesas", e.target.value)}
            onBlur={() => sair("mesas")}
            {...aria("mesas")}
          >
            <option value="">Escolha</option>
            {Object.entries(TABLES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Campo>
        <details className="sm:col-span-2">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium underline underline-offset-4">
            PDV e maquininha (opcional)
          </summary>
          <p className="mb-3 text-sm text-muted-foreground">
            Se souber, informe para prepararmos a conversa. Uma marca nesta lista não significa
            integração disponível.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={id("pdv")} rotulo="Sistema (PDV) que usa hoje" erro={erroDe("pdv")}>
              <select
                id={id("pdv")}
                className={campo}
                value={f.pdv}
                onChange={(e) => mudar("pdv", e.target.value)}
                onBlur={() => f.pdv !== OUTRO && sair("pdv")}
                {...aria("pdv")}
              >
                <option value="">Escolha</option>
                {PDVS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
                <option value={OUTRO}>Outro</option>
              </select>
              {f.pdv === OUTRO && (
                <input
                  aria-label="Qual sistema (PDV)?"
                  maxLength={80}
                  className={campo}
                  value={f.pdvOutro}
                  onChange={(e) => mudar("pdvOutro", e.target.value)}
                  onBlur={() => sair("pdv")}
                />
              )}
            </Campo>
            <Campo
              id={id("maquininha")}
              rotulo="Maquininha que usa hoje"
              erro={erroDe("maquininha")}
            >
              <select
                id={id("maquininha")}
                className={campo}
                value={f.maquininha}
                onChange={(e) => mudar("maquininha", e.target.value)}
                onBlur={() => f.maquininha !== OUTRO && sair("maquininha")}
                {...aria("maquininha")}
              >
                <option value="">Escolha</option>
                {MAQUININHAS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
                <option value={OUTRO}>Outra</option>
              </select>
              {f.maquininha === OUTRO && (
                <input
                  aria-label="Qual maquininha?"
                  maxLength={80}
                  className={campo}
                  value={f.maquininhaOutro}
                  onChange={(e) => mudar("maquininhaOutro", e.target.value)}
                  onBlur={() => sair("maquininha")}
                />
              )}
            </Campo>
          </div>
        </details>
      </fieldset>

      <div className="mt-6 space-y-1">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            id={id("privacidade")}
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-[#03665f]"
            checked={f.privacidade}
            onChange={(e) => mudar("privacidade", e.target.checked)}
            {...aria("privacidade")}
          />
          <span>
            Li e aceito a{" "}
            <Link
              to="/legal/$livro"
              params={{ livro: "privacidade" }}
              target="_blank"
              className="underline underline-offset-2"
            >
              Política de Privacidade
            </Link>
            . Autorizo o contato sobre {order ? "o Tipe Order" : "a demonstração da Tipe"}.
            Novidades são opcionais e posso cancelar seu recebimento.
          </span>
        </label>
        {erroDe("privacidade") && (
          <p id={`${id("privacidade")}-erro`} className="pl-8 text-sm text-destructive">
            {erroDe("privacidade")}
          </p>
        )}
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-[#03665f]"
            checked={f.novidades}
            onChange={(e) => mudar("novidades", e.target.checked)}
          />
          <span>Quero receber novidades da Tipe pelo WhatsApp e e-mail (opcional).</span>
        </label>
      </div>

      {envio === "erro" && (
        <div
          role="alert"
          className="mt-5 flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium">Não conseguimos registrar o seu contato agora.</p>
            <p className="mt-1 text-muted-foreground">
              Não recebemos a confirmação. Seus dados continuam neste formulário: tente novamente
              sem duplicar o cadastro ou fale com a equipe pelo WhatsApp.
            </p>
            <a
              href={zap}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-2 font-medium underline underline-offset-2"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> Falar pelo WhatsApp
            </a>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={envio === "enviando"}
        className={cn(
          "mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-full bg-[#021E34] px-7 text-[1rem] font-medium text-white transition-colors hover:bg-[#03465a] disabled:opacity-70 sm:w-auto",
        )}
      >
        {envio === "enviando" ? "Enviando…" : order ? t.enviar : "Solicitar demonstração"}
      </button>
    </form>
  );
}
