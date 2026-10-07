import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalShell } from "@/components/tipe/legal/LegalShell";
import { GLOSSARY, normalize } from "@/lib/tipe/legal-content";

const TITLE = "Glossário · Central Jurídica TIPE";
const DESC = "Definições dos termos usados nos documentos jurídicos da plataforma TIPE, em ordem alfabética.";

export const Route = createFileRoute("/legal/glossario")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/legal/glossario" }],
  }),
  component: Glossario,
});

const letter = (t: string) => normalize(t).charAt(0).toUpperCase();

function Glossario() {
  const letters = [...new Set(GLOSSARY.map((g) => letter(g.term)))];
  return (
    <LegalShell>
      <main className="mx-auto max-w-[70ch] px-4 py-10">
        <Link to="/legal" className="text-sm text-muted-foreground hover:text-foreground">← Central Jurídica</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">Anexos</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Glossário</h1>
        <nav data-noprint aria-label="Letras" className="sticky top-0 z-20 -mx-4 mt-6 flex flex-wrap gap-1 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          {letters.map((l) => <a key={l} href={`#letra-${l}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm font-bold hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">{l}</a>)}
        </nav>
        {letters.map((l) => (
          <section key={l} id={`letra-${l}`} className="scroll-mt-20 pt-8">
            <h2 className="font-display text-2xl font-bold text-primary">{l}</h2>
            <dl className="mt-3 space-y-4">
              {GLOSSARY.filter((g) => letter(g.term) === l).map((g) => (
                <div key={g.id} id={g.id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 target:border-primary">
                  <dt className="font-display font-bold">{g.term}</dt>
                  <dd className="mt-1 leading-7 text-foreground/90">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </main>
    </LegalShell>
  );
}
