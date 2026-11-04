import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, MessageCircle, Search } from "lucide-react";
import { Secao, SitePage, Titulo } from "@/components/tipe/site/Site";
import { AJUDA } from "@/content/ajuda";
import { WHATSAPP_SITE_MESSAGE, whatsappLink } from "@/lib/tipe/contact";

const TITLE = "Central de ajuda · Dúvidas sobre pagamento na mesa, conta e privacidade | Tipe";
const DESC = "Respostas rápidas sobre pagar pelo QR Code da mesa, estornos, gorjeta, conta do restaurante, verificação em duas etapas, cookies e seus dados na Tipe.";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://tipe.digital/ajuda" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/ajuda" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: AJUDA.flatMap((a) =>
            a.perguntas.map((q) => ({ "@type": "Question", name: q.p, acceptedAnswer: { "@type": "Answer", text: q.r } })),
          ),
        }),
      },
    ],
  }),
  component: Ajuda,
});

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Ajuda() {
  const [busca, setBusca] = useState("");
  const assuntos = useMemo(() => {
    const termos = norm(busca).split(/\s+/).filter((t) => t.length > 1);
    if (termos.length === 0) return AJUDA;
    return AJUDA.map((a) => ({
      ...a,
      perguntas: a.perguntas.filter((q) => {
        const txt = norm(`${q.p} ${q.r}`);
        return termos.every((t) => txt.includes(t));
      }),
    })).filter((a) => a.perguntas.length > 0);
  }, [busca]);

  return (
    <SitePage>
      <Secao className="-mt-16 !pt-32 sm:!pt-40">
        <div className="container-page max-w-4xl">
        <Titulo as="h1" rotulo="Central de ajuda" titulo="Como podemos ajudar?" texto="Respostas rápidas para quem paga na mesa e para quem usa a Tipe no restaurante." />
        <div className="mt-8 max-w-xl">
          <label htmlFor="ajuda-busca" className="sr-only">Buscar na Central de ajuda</label>
          <div className="flex h-12 items-center gap-2 rounded-full border border-border bg-background px-4 focus-within:border-foreground">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              id="ajuda-busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: estorno, Pix, senha, cookies"
              className="h-full flex-1 bg-transparent text-base outline-none"
            />
          </div>
        </div>
        <nav aria-label="Assuntos" className="mt-6 flex flex-wrap gap-2">
          {AJUDA.map((a) => (
            <a key={a.id} href={`#${a.id}`} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              {a.titulo}
            </a>
          ))}
        </nav>

        <div className="mt-12 space-y-12">
          {assuntos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="font-medium">Nenhuma resposta para "{busca}".</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente outra palavra ou fale com a gente pelo WhatsApp.</p>
            </div>
          )}
          {assuntos.map((a) => (
            <section key={a.id} id={a.id} className="scroll-mt-24" aria-labelledby={`${a.id}-titulo`}>
              <h2 id={`${a.id}-titulo`} className="font-display text-xl font-semibold tracking-heading">{a.titulo}</h2>
              <div className="mt-3 divide-y divide-border border-y border-border">
                {a.perguntas.map((q) => (
                  <details key={q.p} className="group" open={busca.length > 1}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.08rem] font-medium [&::-webkit-details-marker]:hidden">
                      {q.p}
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none">
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </span>
                    </summary>
                    <div className="-mt-1 pb-5 pr-10 text-[0.98rem] leading-relaxed text-muted-foreground">
                      <p>{q.r}</p>
                      {q.link && (
                        <a href={q.link.href} className="mt-3 inline-block font-medium text-brand-strong underline underline-offset-4">
                          {q.link.texto}
                        </a>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start gap-4 rounded-3xl border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold">Não achou o que procurava?</p>
            <p className="mt-1 text-sm text-muted-foreground">A equipe da Tipe responde pelo WhatsApp em horário comercial.</p>
          </div>
          <a
            href={whatsappLink(WHATSAPP_SITE_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Falar no WhatsApp
          </a>
        </div>
        </div>
      </Secao>
    </SitePage>
  );
}
