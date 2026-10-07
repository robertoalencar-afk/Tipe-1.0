import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BOOKS, blockText, normalize } from "@/lib/tipe/legal-content";

const INDEX = BOOKS.flatMap((b) => b.chapters.map((c) => {
  const text = c.blocks.map(blockText).join(" ");
  return { book: b, chapter: c, text, norm: normalize(`${c.heading} ${text}`) };
}));

function snippet(text: string, q: string) {
  const n = normalize(text); const p = n.indexOf(normalize(q));
  const start = Math.max(0, p - 50);
  const s = text.slice(start, start + 160);
  const sp = normalize(s).indexOf(normalize(q));
  if (sp < 0) return <>{s}</>;
  return <>{start > 0 && "…"}{s.slice(0, sp)}<mark className="rounded bg-accent px-0.5 text-accent-foreground">{s.slice(sp, sp + q.length)}</mark>{s.slice(sp + q.length)}…</>;
}

/** Busca local: roda só no navegador, o termo não é enviado a nenhum servidor. */
export function LegalSearch({ autoFocus, large }: { autoFocus?: boolean; large?: boolean }) {
  const [q, setQ] = useState("");
  const term = q.trim();
  const groups = useMemo(() => {
    if (term.length < 2) return [];
    const nq = normalize(term);
    const hits = INDEX.filter((x) => x.norm.includes(nq)).slice(0, 30);
    return BOOKS.map((b) => ({ book: b, hits: hits.filter((h) => h.book.slug === b.slug) })).filter((g) => g.hits.length);
  }, [term]);
  return (
    <div className="relative">
      <label className="sr-only" htmlFor="legal-search">Buscar na Central Jurídica</label>
      <Search aria-hidden className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground ${large ? "h-5 w-5" : "h-4 w-4"}`} />
      <input id="legal-search" type="search" autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: gorjeta, estorno, cookies, excluir dados…"
        className={`w-full rounded-full border border-border bg-card pl-11 pr-4 text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring ${large ? "h-14 text-base" : "h-11 text-sm"}`} />
      {term.length >= 2 && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-card p-2 text-left shadow-xl" role="listbox" aria-label="Resultados da busca">
          {groups.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nada encontrado para “{term}”.</p>}
          {groups.map((g) => (
            <div key={g.book.slug} className="p-2">
              <p className="px-2 text-xs font-bold uppercase tracking-wider text-primary">Livro {g.book.number}. {g.book.title}</p>
              {g.hits.map((h) => (
                <Link key={h.chapter.id} to="/legal/$livro" params={{ livro: h.book.slug }} search={{ destaque: term }} hash={h.chapter.id} onClick={() => setQ("")}
                  className="mt-1 block rounded-xl px-2 py-2 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  <span className="block text-sm font-semibold">{h.chapter.heading}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{snippet(h.text, term)}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
