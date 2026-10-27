import { Link } from "@tanstack/react-router";
import { ArrowUp, BookOpen, Cookie, Receipt, ShieldCheck, Sparkles, Store, UserCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/marca/tipe-logo-branco.svg";
import { COMPANY } from "@/lib/tipe/legal";

export const BOOK_ICONS: Record<string, typeof Receipt> = { receipt: Receipt, store: Store, shield: ShieldCheck, cookie: Cookie, sparkles: Sparkles, "user-check": UserCheck };
export const BookIcon = ({ name, className }: { name: string; className?: string }) => { const I = BOOK_ICONS[name] ?? BookOpen; return <I aria-hidden className={className} />; };

function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setP(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0); };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return <div data-noprint className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden><div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${p}%` }} /></div>;
}

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const on = () => setShow(window.scrollY > window.innerHeight); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  if (!show) return null;
  return (
    <button data-noprint type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className="fixed bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg hover:border-primary focus-visible:outline-2 focus-visible:outline-ring" aria-label="Voltar ao topo">
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export function LegalShell({ children }: { children: ReactNode }) {
  return (
    <div className="legal-central min-h-screen bg-background text-foreground">
      <ReadingProgress />
      <header data-noprint className="border-b border-border bg-secondary text-secondary-foreground">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <Link to="/legal" className="flex items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-ring" aria-label="Central Jurídica TIPE">
            <img src={logo} alt="TIPE" width={462} height={141} className="h-7 w-auto" />
            <span className="hidden border-l border-secondary-foreground/25 pl-3 font-display text-sm font-semibold sm:inline">Central Jurídica</span>
          </Link>
          <Link to="/" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground">Voltar ao site</Link>
        </div>
      </header>
      <div className="print-header hidden">TIPE · Central Jurídica · tipe.digital/legal</div>
      {children}
      <footer data-noprint className="mt-16 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs leading-5 text-muted-foreground sm:flex-row sm:justify-between">
          <p>{COMPANY.legalName} · CNPJ {COMPANY.cnpj} · {COMPANY.city}</p>
          <p className="flex flex-wrap gap-x-4"><a href="mailto:contato@tipe.digital" className="hover:text-foreground">contato@tipe.digital</a><Link to="/legal/versoes" className="hover:text-foreground">Histórico de versões</Link><Link to="/legal/glossario" className="hover:text-foreground">Glossário</Link></p>
        </div>
      </footer>
      <BackToTop />
    </div>
  );
}
