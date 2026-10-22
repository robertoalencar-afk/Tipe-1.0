import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Download, History, Info, Link2, ListTree } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { BOOKS, type Book } from "@/lib/tipe/legal-content";
import { Blocks } from "./RichText";
import { BookIcon } from "./LegalShell";
import { LegalSearch } from "./LegalSearch";
import { CookiePanel } from "./CookiePanel";
import { RightsCards, RightsForm } from "./RightsRequest";

const SITE = "https://tipe.digital";
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function copy(url: string) {
  try { await navigator.clipboard.writeText(url); toast.success("Link copiado."); } catch { toast.error("Não foi possível copiar o link."); }
}

function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  history.replaceState(null, "", `#${id}`);
  el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  if (!reduced()) { el.classList.remove("legal-turn"); void el.offsetWidth; el.classList.add("legal-turn"); }
}

function Toc({ book, active, onPick }: { book: Book; active: string; onPick?: () => void }) {
  return (
    <nav aria-label="Sumário da Central Jurídica">
      <ul className="space-y-1">
        {BOOKS.map((b) => {
          const open = b.slug === book.slug;
          return (
            <li key={b.slug}>
              <Link to="/legal/$livro" params={{ livro: b.slug }} onClick={onPick} aria-current={open ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${open ? "font-bold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <BookIcon name={b.icon} className="h-4 w-4 shrink-0 text-primary" /><span>Livro {b.number}. {b.title}</span>
              </Link>
              {open && (
                <ul className="mb-2 ml-4 border-l border-border pl-2">
                  {b.chapters.map((c) => (
                    <li key={c.id}>
                      <a href={`#${c.id}`} onClick={(e) => { e.preventDefault(); onPick?.(); setTimeout(() => goTo(c.id), onPick ? 250 : 0); }} aria-current={active === c.id ? "location" : undefined}
                        className={`block rounded-md px-2 py-2 text-[13px] leading-5 lg:py-1.5 ${active === c.id ? "bg-accent/60 font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {c.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        <li className="pt-2"><Link to="/legal/glossario" onClick={onPick} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Glossário</Link></li>
        <li><Link to="/legal/versoes" onClick={onPick} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Histórico de versões</Link></li>
      </ul>
    </nav>
  );
}

export function BookReader({ book, destaque }: { book: Book; destaque?: string | undefined }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(book.chapters[0]?.id ?? "");
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState(destaque);
  const idx = BOOKS.findIndex((b) => b.slug === book.slug);
  const nextBook = BOOKS[idx + 1];
  const activeIdx = Math.max(0, book.chapters.findIndex((c) => c.id === active));

  useEffect(() => { setQ(destaque); if (!destaque) return; const t = setTimeout(() => setQ(undefined), 4000); return () => clearTimeout(t); }, [destaque, book.slug]);
  useEffect(() => {
    const els = book.chapters.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: "-20% 0px -70% 0px" });
    els.forEach((e) => io.observe(e));
    if (location.hash) setTimeout(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: "start" }), 50);
    return () => io.disconnect();
  }, [book.slug, book.chapters]);

  const step = useCallback((dir: 1 | -1) => {
    const target = book.chapters[activeIdx + dir];
    if (target) goTo(target.id);
    else if (dir === 1 && nextBook) navigate({ to: "/legal/$livro", params: { livro: nextBook.slug } });
  }, [activeIdx, book.chapters, navigate, nextBook]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.altKey || e.ctrlKey || e.metaKey || /input|textarea|select/i.test(t.tagName) || t.isContentEditable) return;
      if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [step]);

  const url = `${SITE}/legal/${book.slug}`;
  return (
    <>
      {/* Barra fina no celular */}
      <div data-noprint className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
        <div className="min-w-0"><p className="truncate text-sm font-bold">{book.title}</p><p className="text-xs text-muted-foreground">Capítulo {activeIdx + 1} de {book.chapters.length}</p></div>
        <Button size="sm" variant="outline" onClick={() => setDrawer(true)} aria-haspopup="dialog"><ListTree className="mr-1 h-4 w-4" />Sumário</Button>
      </div>
      <Drawer open={drawer} onOpenChange={setDrawer}>
        <DrawerContent className="max-h-[85svh]">
          <DrawerHeader><DrawerTitle>Sumário</DrawerTitle></DrawerHeader>
          <div className="overflow-y-auto px-3 pb-8"><Toc book={book} active={active} onPick={() => setDrawer(false)} /></div>
        </DrawerContent>
      </Drawer>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-10 px-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside data-noprint className="hidden lg:block">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto py-8 pr-2">
            <div className="mb-5"><LegalSearch /></div>
            <Toc book={book} active={active} />
          </div>
        </aside>

        <article className="mx-auto w-full max-w-[70ch] py-8 lg:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Livro {book.number}</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{book.fullTitle.replace(/^Livro \d+\.\s*/, "")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Versão {book.version} · vigente desde {book.effective} · {book.readingMinutes} min de leitura</p>
          <div data-noprint className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()}><Download className="mr-1 h-4 w-4" />Baixar PDF</Button>
            <Button size="sm" variant="outline" asChild><Link to="/legal/versoes" hash={book.slug}><History className="mr-1 h-4 w-4" />Versões anteriores</Link></Button>
            <Button size="sm" variant="outline" onClick={() => copy(url)}><Link2 className="mr-1 h-4 w-4" />Copiar link</Button>
          </div>

          <aside className="mt-8 rounded-2xl border-l-4 border-primary bg-accent/35 p-5" aria-label="Em resumo">
            <p className="flex items-center gap-2 font-display text-sm font-bold"><Info aria-hidden className="h-4 w-4 text-primary" />Em resumo</p>
            <p className="mt-2 leading-7">{book.summary}</p>
            <p className="mt-3 text-xs text-muted-foreground">Este resumo ajuda a entender; o texto completo abaixo é o que vale.</p>
          </aside>

          {book.chapters.map((c, i) => {
            const prev = book.chapters[i - 1]; const next = book.chapters[i + 1];
            return (
              <section key={c.id} id={c.id} className="legal-chapter scroll-mt-20 pt-10" aria-labelledby={`${c.id}-h`}>
                <h2 id={`${c.id}-h`} className="group flex items-start gap-2 font-display text-xl font-bold sm:text-2xl">
                  <span>{c.heading}</span>
                  <button data-noprint type="button" onClick={() => copy(`${url}#${c.id}`)} className="mt-1 rounded p-1 text-muted-foreground opacity-60 hover:text-primary hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Copiar link do capítulo ${c.heading}`}>
                    <Link2 className="h-4 w-4" />
                  </button>
                </h2>
                {book.slug === "seus-direitos" && c.number === "6.1"
                  ? <RightsCards rows={c.blocks.find((b) => b.type === "table")?.type === "table" ? (c.blocks.find((b) => b.type === "table") as { rows: string[][] }).rows : []} />
                  : <Blocks blocks={c.blocks} q={q} />}
                {book.slug === "cookies" && c.number === "4.4" && <CookiePanel />}
                {book.slug === "seus-direitos" && c.number === "6.2" && <RightsForm />}
                <div data-noprint className="mt-8 grid gap-3 sm:grid-cols-2">
                  {prev ? <button type="button" onClick={() => goTo(prev.id)} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"><ChevronLeft className="h-5 w-5 shrink-0 text-primary" /><span><span className="block text-xs text-muted-foreground">Capítulo anterior</span><span className="text-sm font-semibold">{prev.heading}</span></span></button> : <span className="hidden sm:block" />}
                  {next
                    ? <button type="button" onClick={() => goTo(next.id)} className="flex items-center justify-end gap-2 rounded-2xl border border-border bg-card p-4 text-right hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"><span><span className="block text-xs text-muted-foreground">Próximo capítulo</span><span className="text-sm font-semibold">{next.heading}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-primary" /></button>
                    : nextBook && <Link to="/legal/$livro" params={{ livro: nextBook.slug }} className="flex items-center justify-end gap-2 rounded-2xl border border-primary bg-card p-4 text-right hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-ring"><span><span className="block text-xs text-muted-foreground">Próximo livro</span><span className="text-sm font-semibold">Livro {nextBook.number}. {nextBook.title}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-primary" /></Link>}
                </div>
              </section>
            );
          })}
        </article>
      </div>
    </>
  );
}
