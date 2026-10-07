import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { LegalShell } from "@/components/tipe/legal/LegalShell";
import { ARCHIVED, BOOKS, VERSIONS } from "@/lib/tipe/legal-content";

const TITLE = "Histórico de versões · Central Jurídica TIPE";
const DESC = "Todas as versões dos Termos, Privacidade, Cookies e demais documentos da plataforma TIPE, com datas de vigência.";

export const Route = createFileRoute("/legal/versoes")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/legal/versoes" }],
  }),
  component: Versoes,
});

function Versoes() {
  const child = useMatches({ select: (m) => m.some((x) => x.routeId === "/legal/versoes/$arquivo") });
  if (child) return <Outlet />;
  return (
    <LegalShell>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link to="/legal" className="text-sm text-muted-foreground hover:text-foreground">← Central Jurídica</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">Anexos</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Histórico de versões</h1>
        <div className="mt-6 overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Histórico de versões">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-muted"><tr><th className="px-3 py-2.5">Documento</th><th className="px-3 py-2.5">Versão</th><th className="px-3 py-2.5">Vigência</th><th className="px-3 py-2.5">Principais mudanças</th></tr></thead>
            <tbody>{VERSIONS.map((v) => <tr key={v.doc + v.version} className="border-t border-border align-top"><td className="px-3 py-2.5 font-semibold">{v.doc}</td><td className="px-3 py-2.5">{v.version}</td><td className="px-3 py-2.5">{v.effective}</td><td className="px-3 py-2.5 leading-6 text-foreground/90">{v.changes}</td></tr>)}</tbody>
          </table>
        </div>
        <h2 className="mt-12 font-display text-xl font-bold">Versões por livro</h2>
        <div className="mt-4 space-y-4">
          {BOOKS.map((b) => {
            const old = ARCHIVED.filter((a) => a.book === b.slug);
            return (
              <section key={b.slug} id={b.slug} className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 target:border-primary">
                <h3 className="font-display font-bold">Livro {b.number}. {b.title}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li><Link to="/legal/$livro" params={{ livro: b.slug }} className="font-semibold text-primary hover:underline">Versão {b.version} · vigente desde {b.effective}</Link> <span className="text-muted-foreground">(vigente)</span></li>
                  {old.map((a) => <li key={a.id}><Link to="/legal/versoes/$arquivo" params={{ arquivo: a.id }} className="hover:underline">Versão {a.version} · {a.effective}</Link> <span className="text-muted-foreground">(arquivada)</span></li>)}
                  {old.length === 0 && <li className="text-muted-foreground">Primeira versão.</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </LegalShell>
  );
}
