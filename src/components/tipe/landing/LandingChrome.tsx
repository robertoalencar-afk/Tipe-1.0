import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Instagram, Menu, MessageCircle, X } from "lucide-react";
import logo from "@/assets/logo-dark.png.asset.json";
import { PrivacyPreferences } from "@/components/tipe/PrivacyPreferences";
import { COMPANY } from "@/lib/tipe/legal";
import { WHATSAPP_SITE_MESSAGE, whatsappLink } from "@/lib/tipe/contact";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#para-restaurantes", label: "Para restaurantes" },
  { href: "#para-clientes", label: "Para clientes" },
] as const;

const SOLUCOES = [
  { href: "#como-funciona", title: "Pagamento na mesa", text: "QR Code, conta ao vivo e Pix" },
  { href: "#painel", title: "Painel do restaurante", text: "Mesas, caixa e pagamentos" },
  { href: "#para-garcons", title: "Área do garçom", text: "Gorjetas extras e saques" },
  { href: "#integracoes", title: "Integrações", text: "O que já funciona e o que vem aí" },
] as const;

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [solucoes, setSolucoes] = useState(false);
  const solRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!solucoes) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !solRef.current?.contains(e.target as Node)) setSolucoes(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [solucoes]);

  useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [menu]);

  const linkCls = "rounded-full px-3.5 py-2 text-[0.95rem] font-medium text-foreground/85 transition-colors hover:text-foreground";
  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-200", scrolled || menu ? "border-b border-border/70 bg-background/85 backdrop-blur-xl" : "border-b border-transparent bg-transparent")}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="TIPE, página inicial" className="shrink-0"><img src={logo.url} alt="TIPE" width={120} height={36} className="h-8 w-auto" /></Link>

        <nav aria-label="Principal" className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => <a key={n.href} href={n.href} className={linkCls}>{n.label}</a>)}
          <div ref={solRef} className="relative">
            <button type="button" aria-expanded={solucoes} aria-haspopup="true" onClick={() => setSolucoes((v) => !v)} className={cn(linkCls, "inline-flex items-center gap-1")}>
              Soluções <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", solucoes && "rotate-180")} />
            </button>
            {solucoes && (
              <div className="absolute left-1/2 top-full mt-2 w-[22rem] -translate-x-1/2 rounded-2xl border border-border bg-surface p-2 shadow-lift">
                {SOLUCOES.map((s) => (
                  <a key={s.title} href={s.href} onClick={() => setSolucoes(false)} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-background-muted">
                    <span className="block text-sm font-semibold">{s.title}</span>
                    <span className="block text-xs text-muted-foreground">{s.text}</span>
                  </a>
                ))}
                <Link to="/simulador" className="mt-1 flex items-center justify-between rounded-xl bg-background-muted px-3 py-2.5 text-sm font-semibold">Testar o simulador <span aria-hidden>→</span></Link>
              </div>
            )}
          </div>
          <a href="#precos" className={linkCls}>Preços</a>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link to="/entrar" className="hidden h-11 items-center rounded-full border border-border px-6 text-[0.95rem] font-medium text-foreground transition-colors hover:border-foreground/40 sm:inline-flex">Entrar</Link>
          <a href="#demonstracao" className="hidden h-11 items-center rounded-full bg-ink px-6 text-[0.95rem] font-medium text-white transition-colors hover:bg-ink-soft sm:inline-flex">Agendar demonstração</a>
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-controls="menu-mobile" aria-label={menu ? "Fechar menu" : "Abrir menu"} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface lg:hidden">
            {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menu && (
        <div id="menu-mobile" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-background px-5 pb-10 pt-4 lg:hidden">
          <nav aria-label="Menu" className="flex flex-col">
            {[...NAV, { href: "#para-garcons", label: "Para garçons" }, { href: "#painel", label: "Painel do restaurante" }, { href: "#integracoes", label: "Integrações" }, { href: "#precos", label: "Preços" }, { href: "#duvidas", label: "Dúvidas" }].map((n) => (
              <a key={n.href + n.label} href={n.href} onClick={() => setMenu(false)} className="border-b border-border py-4 font-display text-lg font-semibold">{n.label}</a>
            ))}
            <Link to="/simulador" onClick={() => setMenu(false)} className="border-b border-border py-4 font-display text-lg font-semibold">Testar o simulador</Link>
          </nav>
          <div className="mt-6 grid gap-2">
            <a href="#demonstracao" onClick={() => setMenu(false)} className="flex h-12 items-center justify-center rounded-full bg-ink font-semibold text-white">Agendar demonstração</a>
            <Link to="/entrar" onClick={() => setMenu(false)} className="flex h-12 items-center justify-center rounded-full border border-border bg-surface font-semibold">Entrar</Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function LandingFooter() {
  const col = "space-y-2.5 text-sm";
  const a = "block text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <img src={logo.url} alt="TIPE" width={120} height={36} loading="lazy" className="h-8 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">Pagamento na mesa por QR Code para restaurantes, bares e cafeterias.</p>
          <div className="mt-5 flex gap-2">
            <a href="https://instagram.com/tipe.digital" target="_blank" rel="noopener noreferrer" aria-label="Instagram @tipe.digital" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"><Instagram className="h-4 w-4" /></a>
            <a href={whatsappLink(WHATSAPP_SITE_MESSAGE)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da TIPE" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"><MessageCircle className="h-4 w-4" /></a>
          </div>
        </div>
        <div className={col}>
          <p className="font-display font-semibold">Produto</p>
          <a href="#como-funciona" className={a}>Como funciona</a>
          <a href="#painel" className={a}>Painel do restaurante</a>
          <a href="#para-garcons" className={a}>Área do garçom</a>
          <a href="#integracoes" className={a}>Integrações</a>
          <Link to="/simulador" className={a}>Simulador</Link>
        </div>
        <div className={col}>
          <p className="font-display font-semibold">Comercial</p>
          <a href="#precos" className={a}>Preços</a>
          <a href="#demonstracao" className={a}>Agendar demonstração</a>
          <a href="#duvidas" className={a}>Dúvidas frequentes</a>
          <a href={whatsappLink(WHATSAPP_SITE_MESSAGE)} target="_blank" rel="noopener noreferrer" className={a}>Falar no WhatsApp</a>
          <Link to="/entrar" className={a}>Entrar</Link>
        </div>
        <div className={col}>
          <p className="font-display font-semibold">Jurídico</p>
          <Link to="/legal/$livro" params={{ livro: "termos-de-uso" }} className={a}>Termos de Uso</Link>
          <Link to="/legal/$livro" params={{ livro: "privacidade" }} className={a}>Privacidade</Link>
          <Link to="/legal/$livro" params={{ livro: "cookies" }} className={a}>Cookies</Link>
          <Link to="/legal/$livro" params={{ livro: "parceiros" }} className={a}>Termos para Parceiros</Link>
          <Link to="/legal/$livro" params={{ livro: "seus-direitos" }} hash="solicitacao" className={a}>Seus direitos (LGPD)</Link>
          <PrivacyPreferences triggerClassName={a} />
        </div>
      </div>
      <div className="border-t border-border">
        <p className="container-page py-5 text-xs text-muted-foreground">© {new Date().getFullYear()} {COMPANY.legalName} · CNPJ {COMPANY.cnpj} · {COMPANY.city}</p>
      </div>
    </footer>
  );
}
