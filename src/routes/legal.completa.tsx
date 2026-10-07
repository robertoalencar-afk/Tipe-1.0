import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalShell } from "@/components/tipe/legal/LegalShell";
import { Blocks } from "@/components/tipe/legal/RichText";
import { BOOKS, GLOSSARY, VERSIONS } from "@/lib/tipe/legal-content";

const TITLE = "Central Jurídica completa · TIPE";
const DESC = "Todos os livros da Central Jurídica da TIPE em uma única página, pronta para imprimir ou salvar em PDF.";

export const Route = createFileRoute("/legal/completa")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/legal" }],
  }),
  component: Completa,
});

function Completa() {
  return (
    <LegalShell>
      <main className="mx-auto max-w-[70ch] px-4 py-10">
        <div data-noprint className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/legal" className="text-sm text-muted-foreground hover:text-foreground">← Central Jurídica</Link>
          <Button onClick={() => window.print()}><Download className="mr-1 h-4 w-4" />Salvar em PDF</Button>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Central Jurídica TIPE</h1>
        {BOOKS.map((b) => (
          <article key={b.slug} className="legal-print-book mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Livro {b.number}</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{b.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Versão {b.version} · vigente desde {b.effective}</p>
            <div className="mt-4 rounded-2xl border-l-4 border-primary bg-accent/35 p-4"><p className="text-sm font-bold">Em resumo</p><p className="mt-1 leading-7">{b.summary}</p></div>
            {b.chapters.map((c) => <section key={c.id} className="pt-6"><h3 className="font-display text-lg font-bold">{c.heading}</h3><Blocks blocks={c.blocks} /></section>)}
          </article>
        ))}
        <article className="legal-print-book mt-12">
          <h2 className="font-display text-2xl font-bold">Glossário</h2>
          <dl className="mt-3 space-y-2">{GLOSSARY.map((g) => <div key={g.id}><dt className="font-semibold">{g.term}</dt><dd className="text-foreground/90">{g.definition}</dd></div>)}</dl>
          <h2 className="mt-10 font-display text-2xl font-bold">Histórico de versões</h2>
          <ul className="mt-3 space-y-1 text-sm">{VERSIONS.map((v) => <li key={v.doc + v.version}><strong>{v.doc} {v.version}</strong> · {v.effective} · {v.changes}</li>)}</ul>
        </article>
      </main>
    </LegalShell>
  );
}
