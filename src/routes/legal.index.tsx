import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookIcon, LegalShell } from "@/components/tipe/legal/LegalShell";
import { LegalSearch } from "@/components/tipe/legal/LegalSearch";
import { BOOKS, QUICK_QUESTIONS, chapterAnchor, type Audience } from "@/lib/tipe/legal-content";
import { COMPANY } from "@/lib/tipe/legal";

const TITLE = "Central Jurídica TIPE: termos, privacidade e seus direitos";
const DESC = "Termos de Uso, Termos para Parceiros, Privacidade, Cookies, IA e direitos LGPD da plataforma TIPE, em linguagem simples.";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "website" }, { property: "og:url", content: "https://tipe.digital/legal" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/legal" }],
  }),
  component: Capa,
});

const PERFIS: { id: "cliente" | "restaurante" | "tudo"; label: string }[] = [
  { id: "cliente", label: "Sou cliente de restaurante" }, { id: "restaurante", label: "Sou restaurante" }, { id: "tudo", label: "Ver tudo" },
];
const destaca = (perfil: string, a: Audience) => perfil === "tudo" || a === "ambos" || a === perfil;

function Capa() {
  const [perfil, setPerfil] = useState<"cliente" | "restaurante" | "tudo">("tudo");
  return (
    <LegalShell>
      <section className="border-b border-border bg-secondary text-secondary-foreground">
        <div className="mx-auto max-w-4xl px-4 pb-14 pt-12 text-center sm:pt-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">tipe.digital/legal</p>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-5xl">Central Jurídica TIPE</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-secondary-foreground/80 sm:text-lg">Tudo sobre como a TIPE funciona, seus direitos e seus dados, em linguagem simples.</p>
          <div className="mx-auto mt-8 max-w-2xl text-foreground"><LegalSearch large /></div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4">
        <div data-noprint className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Escolha seu perfil">
          {PERFIS.map((p) => (
            <button key={p.id} type="button" aria-pressed={perfil === p.id} onClick={() => setPerfil(p.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring ${perfil === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}>
              {p.label}
            </button>
          ))}
        </div>

        <h2 className="sr-only">Sumário</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BOOKS.map((b) => {
            const on = destaca(perfil, b.audience);
            return (
              <li key={b.slug} className={`transition-opacity ${on ? "" : "opacity-45"}`}>
                <Link to="/legal/$livro" params={{ livro: b.slug }}
                  className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Livro {b.number}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/50"><BookIcon name={b.icon} className="h-5 w-5 text-foreground" /></span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{b.title}</h3>
                  <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{b.description}</p>
                  <p className="mt-4 text-xs text-muted-foreground">{b.readingMinutes} min de leitura · {b.chapters.length} capítulos</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">Abrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                </Link>
              </li>
            );
          })}
        </ul>

        <section className="mt-14" aria-labelledby="perguntas">
          <h2 id="perguntas" className="font-display text-xl font-bold">Perguntas rápidas</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((x) => (
              <Link key={x.q} to="/legal/$livro" params={{ livro: x.book }} hash={chapterAnchor(x.book, x.chapter)}
                className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-primary hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-ring">
                {x.q}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold">Quem somos</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{COMPANY.legalName}, nome fantasia TIPE, CNPJ {COMPANY.cnpj}, {COMPANY.city}. Contato: contato@tipe.digital. Encarregado (DPO): Roberto Augusto Freitas Alencar Filho, roberto@tipe.digital.</p>
            <p className="mt-2 text-sm"><Link to="/legal/versoes" className="font-semibold text-primary hover:underline">Histórico de versões</Link> · <Link to="/legal/glossario" className="font-semibold text-primary hover:underline">Glossário</Link></p>
          </div>
          <Button variant="outline" asChild data-noprint><Link to="/legal/completa"><Download className="mr-1 h-4 w-4" />Baixar Central completa</Link></Button>
        </section>
      </main>
    </LegalShell>
  );
}
