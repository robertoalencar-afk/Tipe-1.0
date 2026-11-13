/**
 * "Monte sua operação": quatro perguntas, recomendação de módulos na hora (sem preço) e três
 * saídas: ver a demonstração, falar no WhatsApp ou pedir proposta. A proposta usa o mesmo
 * FormularioOrder da página, com as respostas anexadas; o servidor transforma tudo em notas
 * da Central Tipe (resumoParaCrm) e marca interesse em totem.
 */
import { useMemo, useState } from "react";
import { ArrowRight, Check, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/tipe/contact";
import type { EstadoLancamento } from "@/lib/tipe/launch-state";
import {
  COMO_PEDEM,
  ESTABELECIMENTOS,
  MELHORIAS,
  NOME_COMO_PEDEM,
  NOME_ESTABELECIMENTO,
  NOME_MELHORIA,
  ORDEM_SELETOR,
  DEFINICOES,
  TEXTO_DISPONIBILIDADE,
  recomendar,
  type Modalidade,
  type RespostasConfigurador,
} from "@/lib/tipe/order/modalidades";
import { trackProduto } from "@/lib/tipe/tracking";
import { Secao, Titulo } from "../Site";
import { ICONE_MODALIDADE, SeloDisponibilidade } from "./EscolhaAtendimento";
import { FormularioOrder } from "./FormularioOrder";

const VAZIO: RespostasConfigurador = {
  estabelecimento: null,
  modalidades: [],
  comoPedem: null,
  melhorias: [],
};

function Opcao({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-[0.92rem] font-medium transition-colors",
        ativa
          ? "border-[#0FC9BD] bg-[#0FC9BD] text-[#021E34]"
          : "border-white/20 bg-white/5 text-white hover:border-white/50",
      )}
    >
      {ativa && <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
      {children}
    </button>
  );
}

function Pergunta({
  n,
  titulo,
  dica,
  children,
}: {
  n: number;
  titulo: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-display text-[1.25rem] tracking-[-0.02em] text-white">
        <span className="mr-2 text-[#0FC9BD] tabular-nums">{n}.</span>
        {titulo}
      </legend>
      {dica && <p className="mt-1 text-[0.85rem] text-white/60">{dica}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function MonteSuaOperacao({ estado }: { estado: EstadoLancamento }) {
  const [r, setR] = useState<RespostasConfigurador>(VAZIO);
  const [proposta, setProposta] = useState(false);
  const rec = useMemo(() => recomendar(r), [r]);
  const respondeu =
    !!r.estabelecimento || r.modalidades.length > 0 || !!r.comoPedem || r.melhorias.length > 0;

  const alternar = <T,>(lista: T[], v: T) =>
    lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
  const mudar = (patch: Partial<RespostasConfigurador>) => {
    setR((a) => ({ ...a, ...patch }));
    trackProduto("produto_cta", { produto: "order", local: "configurador_resposta" });
  };

  const msgZap = `Olá! Montei minha operação no site da Tipe: ${rec.frase} Quero conversar sobre a implantação.`;

  return (
    <Secao tema="escuro" id="monte-sua-operacao">
      <div className="container-page">
        <Titulo
          rotulo="Monte sua operação"
          titulo="Conte como a sua casa atende. A Tipe sugere os módulos."
          texto="Quatro perguntas, sem cadastro. A recomendação aparece na hora e explica as condições de cada modalidade. A proposta, com valores, é feita pela equipe da Tipe."
        />

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <form
            className="space-y-8 rounded-[2rem] bg-[#021E34] p-5 text-white ring-1 ring-white/10 sm:p-8"
            onSubmit={(e) => e.preventDefault()}
          >
            <Pergunta n={1} titulo="Que tipo de estabelecimento é o seu?">
              {ESTABELECIMENTOS.map((e) => (
                <Opcao
                  key={e}
                  ativa={r.estabelecimento === e}
                  onClick={() => mudar({ estabelecimento: r.estabelecimento === e ? null : e })}
                >
                  {NOME_ESTABELECIMENTO[e]}
                </Opcao>
              ))}
            </Pergunta>
            <Pergunta n={2} titulo="Como você atende?" dica="Pode marcar mais de um.">
              {ORDEM_SELETOR.map((m: Modalidade) => {
                const I = ICONE_MODALIDADE[m];
                return (
                  <Opcao
                    key={m}
                    ativa={r.modalidades.includes(m)}
                    onClick={() => mudar({ modalidades: alternar(r.modalidades, m) })}
                  >
                    <I className="h-4 w-4" aria-hidden /> {DEFINICOES[m].nome}
                  </Opcao>
                );
              })}
            </Pergunta>
            <Pergunta n={3} titulo="Como os clientes pedem hoje?">
              {COMO_PEDEM.map((c) => (
                <Opcao
                  key={c}
                  ativa={r.comoPedem === c}
                  onClick={() => mudar({ comoPedem: r.comoPedem === c ? null : c })}
                >
                  {NOME_COMO_PEDEM[c]}
                </Opcao>
              ))}
            </Pergunta>
            <Pergunta n={4} titulo="O que você quer melhorar?" dica="Pode marcar mais de um.">
              {MELHORIAS.map((m) => (
                <Opcao
                  key={m}
                  ativa={r.melhorias.includes(m)}
                  onClick={() => mudar({ melhorias: alternar(r.melhorias, m) })}
                >
                  {NOME_MELHORIA[m]}
                </Opcao>
              ))}
            </Pergunta>
            {respondeu && (
              <button
                type="button"
                onClick={() => {
                  setR(VAZIO);
                  setProposta(false);
                }}
                className="text-sm text-white/60 underline-offset-4 hover:underline"
              >
                Limpar respostas
              </button>
            )}
          </form>

          <aside className="lg:sticky lg:top-24 lg:self-start" aria-live="polite">
            <div className="rounded-[2rem] bg-background-muted p-5 ring-1 ring-border sm:p-8">
              <p className="flex items-center gap-2 font-display text-[1.05rem] tracking-[-0.02em] text-brand-strong">
                <Sparkles className="h-4.5 w-4.5" aria-hidden /> Recomendação
              </p>
              <p className="mt-3 text-[1.1rem] leading-snug sm:text-[1.25rem]">
                {respondeu
                  ? rec.frase
                  : "Responda ao lado. A sugestão de módulos aparece aqui, sem preço e sem cadastro."}
              </p>
              <ul className="mt-6 space-y-3">
                {rec.modulos.map((m) => (
                  <li
                    key={m.modulo}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-background p-4 ring-1 ring-border"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{m.nome}</p>
                      <p className="mt-0.5 text-[0.85rem] leading-relaxed text-muted-foreground">
                        {m.papel}
                      </p>
                      {m.por.length > 0 && (
                        <p className="mt-1 text-[0.75rem] text-muted-foreground/80">
                          Para: {m.por.map((x) => DEFINICOES[x].nome).join(", ")}
                        </p>
                      )}
                    </div>
                    <SeloDisponibilidade
                      d={m.disponibilidade}
                      className="shrink-0 text-[#021E34]"
                    />
                  </li>
                ))}
              </ul>
              {rec.modalidadesFuturas.length > 0 && (
                <p className="mt-4 text-[0.85rem] leading-relaxed text-muted-foreground">
                  {rec.modalidadesFuturas.map((m) => DEFINICOES[m].nome).join(", ")}:{" "}
                  {rec.modalidadesFuturas.length === 1
                    ? "ainda não está disponível"
                    : "ainda não estão disponíveis"}
                  . Entra na proposta como interesse, e você é avisado quando sair.
                </p>
              )}
              <p className="mt-3 text-[0.75rem] text-muted-foreground/80">
                {TEXTO_DISPONIBILIDADE.operacional.selo}: em uso.{" "}
                {TEXTO_DISPONIBILIDADE.piloto.selo}: consulte as condições com a equipe. Os valores
                vêm na proposta.
              </p>

              <div className="mt-6 grid gap-2">
                <a
                  href="#simulador"
                  onClick={() =>
                    trackProduto("produto_cta", { produto: "order", local: "configurador_demo" })
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#021E34] px-5 text-[0.95rem] font-medium text-white hover:bg-[#03465a]"
                >
                  Ver demonstração <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <a
                  href={whatsappLink(msgZap)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackProduto("produto_cta", {
                      produto: "order",
                      local: "configurador_whatsapp",
                    })
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#021E34]/30 px-5 text-[0.95rem] font-medium text-[#021E34] hover:border-[#021E34]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden /> Falar no WhatsApp
                </a>
                <button
                  type="button"
                  aria-expanded={proposta}
                  onClick={() => {
                    setProposta((v) => !v);
                    trackProduto("produto_cta", {
                      produto: "order",
                      local: "configurador_proposta",
                    });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#021E34]/30 px-5 text-[0.95rem] font-medium text-[#021E34] hover:border-[#021E34]"
                >
                  {proposta ? "Fechar formulário" : "Receber proposta"}
                </button>
              </div>
            </div>
          </aside>
        </div>

        {proposta && (
          <div className="mt-8 rounded-[2rem] bg-[linear-gradient(120deg,#021E34_0%,#03465a_55%,#0b8f87_100%)] p-5 text-white sm:p-8 lg:p-10">
            <p className="font-display text-[1.5rem] tracking-[-0.03em] sm:text-[1.9rem]">
              Proposta para a sua operação
            </p>
            <p className="mt-2 max-w-2xl text-white/80">
              Suas respostas vão junto. A equipe da Tipe responde pelo WhatsApp com os módulos
              sugeridos e os valores.
            </p>
            <div className="mt-6">
              <FormularioOrder estado={estado} operacao={r} />
            </div>
          </div>
        )}
      </div>
    </Secao>
  );
}
