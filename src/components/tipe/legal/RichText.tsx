import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GLOSSARY, normalize, type Block } from "@/lib/tipe/legal-content";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERMS = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length);
const TERM_RE = TERMS.length ? new RegExp(`(?<![\\p{L}\\d])(${TERMS.map((t) => escapeRe(t.term)).join("|")})(?![\\p{L}\\d])`, "giu") : null;

function GlossaryTerm({ text, id, definition }: { text: string; id: string; definition: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
          className="cursor-help underline decoration-primary decoration-dotted decoration-2 underline-offset-4 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring">
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm leading-6" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <p className="font-semibold">{text}</p>
        <p className="mt-1 text-muted-foreground">{definition}</p>
        <Link to="/legal/glossario" hash={id} className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-2 hover:underline">Ver no glossário</Link>
      </PopoverContent>
    </Popover>
  );
}

function highlight(text: string, q: string | undefined, key: string): ReactNode[] {
  if (!q) return [text];
  const n = normalize(text); const nq = normalize(q);
  const out: ReactNode[] = []; let i = 0; let k = 0;
  for (let p = n.indexOf(nq); p >= 0 && nq; p = n.indexOf(nq, p + nq.length)) {
    out.push(text.slice(i, p), <mark key={`${key}m${k++}`} className="rounded bg-accent px-0.5 text-accent-foreground">{text.slice(p, p + nq.length)}</mark>);
    i = p + nq.length;
  }
  out.push(text.slice(i));
  return out;
}

/** Texto com termos do glossário (1ª ocorrência por capítulo) e destaque opcional da busca. */
export function Rich({ text, seen, q }: { text: string; seen: Set<string>; q?: string | undefined }) {
  if (!TERM_RE) return <>{highlight(text, q, "t")}</>;
  const parts: ReactNode[] = []; let last = 0; let k = 0;
  for (const m of text.matchAll(TERM_RE)) {
    const t = TERMS.find((x) => x.term.toLowerCase() === m[0].toLowerCase());
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    parts.push(...highlight(text.slice(last, m.index), q, `a${k}`));
    parts.push(<GlossaryTerm key={`g${k++}`} text={m[0]} id={t.id} definition={t.definition} />);
    last = m.index! + m[0].length;
  }
  parts.push(...highlight(text.slice(last), q, "z"));
  return <>{parts}</>;
}

export function Blocks({ blocks, q }: { blocks: Block[]; q?: string | undefined }) {
  const seen = new Set<string>();
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "p") return <p key={i} className="mt-4 leading-7 text-foreground/90"><Rich text={b.text} seen={seen} q={q} /></p>;
        if (b.type === "ul") return (
          <ul key={i} className="mt-4 space-y-2.5 leading-7 text-foreground/90">
            {b.items.map((it, j) => <li key={j} className="flex gap-3"><span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span><Rich text={it} seen={seen} q={q} /></span></li>)}
          </ul>
        );
        return (
          <div key={i} className="mt-5 overflow-x-auto rounded-xl border border-border" role="region" aria-label="Tabela" tabIndex={0}>
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead className="bg-muted"><tr>{b.head.map((h, j) => <th key={j} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j} className="border-t border-border align-top">{r.map((c, x) => <td key={x} className="px-3 py-2.5 leading-6 text-foreground/90"><Rich text={c} seen={seen} q={q} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
