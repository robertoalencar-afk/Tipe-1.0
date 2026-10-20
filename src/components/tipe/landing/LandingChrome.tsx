import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Instagram, Menu, MessageCircle, X } from "lucide-react";
import logo from "@/assets/marca/tipe-logo.svg";
import logoBranco from "@/assets/marca/tipe-logo-branco.svg";
import { fotoSrc } from "@/components/tipe/site/Foto";
import { PRODUTOS } from "@/components/tipe/site/produtos";
import { PrivacyPreferences } from "@/components/tipe/PrivacyPreferences";
import { COMPANY } from "@/lib/tipe/legal";
import { WHATSAPP_SITE_MESSAGE, whatsappLink } from "@/lib/tipe/contact";
import { cn } from "@/lib/utils";
import { useHeaderEscondido } from "./motion";

const NAV = [
  { href: "/produtos/ai", label: "Tipe AI" },
  { href: "/integracoes", label: "Integrações" },
  { href: "/precos", label: "Preços" },
] as const;

/** Logo oficial; troca para a versão branca quando o fundo da página fica escuro. */
function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src={logo} alt="Tipe" width={462} height={141} className={cn("logo-claro", className)} />
      <img
        src={logoBranco}
        alt=""
        aria-hidden
        width={462}
        height={141}
        className={cn("logo-escuro", className)}
      />
    </>
  );
}

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [solucoes, setSolucoes] = useState(false);
  const solRef = useRef<HTMLDivElement>(null);
  const rolouPraBaixo = useHeaderEscondido(300);
  const escondido = rolouPraBaixo && !menu && !solucoes;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!solucoes) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !solRef.current?.contains(e.target as Node)
      )
        setSolucoes(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [solucoes]);

  useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menu]);

  const linkCls =
    "rounded-full px-3.5 py-2 text-[0.95rem] font-medium text-foreground/85 transition-colors hover:text-foreground";
  return (
    <>
      <header
        data-escondido={escondido || undefined}
        className={cn(
          "header-auto sticky top-0 z-40",
          scrolled || menu
            ? "border-b border-border/70 bg-background/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="Tipe, página inicial" className="shrink-0">
            <Logo className="h-8 w-auto" />
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-0.5 lg:flex">
            <div ref={solRef}>
              <button
                type="button"
                aria-expanded={solucoes}
                aria-haspopup="true"
                onClick={() => setSolucoes((v) => !v)}
                className={cn(linkCls, "inline-flex items-center gap-1")}
              >
                Produtos{" "}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", solucoes && "rotate-180")}
                />
              </button>
              {solucoes && (
                <div className="absolute inset-x-0 top-full">
                  <div className="menu-in container-page pb-6">
                    <div className="grid grid-cols-[1fr_17rem] gap-3 rounded-[1.75rem] border border-border bg-background p-3 shadow-lift">
                      <ul className="grid grid-cols-2 gap-1 xl:grid-cols-3">
                        {PRODUTOS.map((p) => (
                          <li key={p.slug}>
                            <a
                              href={`/produtos/${p.slug}`}
                              onClick={() => setSolucoes(false)}
                              className="group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-background-muted"
                            >
                              <img
                                src={fotoSrc(p.foto).src}
                                alt=""
                                loading="lazy"
                                className="h-16 w-16 shrink-0 rounded-xl object-cover transition-transform duration-700 group-hover:scale-105"
                                style={{ objectPosition: p.posicao }}
                              />
                              <span className="min-w-0">
                                <span className="flex items-center gap-2 text-[0.95rem] font-medium">
                                  {p.nome}
                                  {p.status === "em-breve" && (
                                    <span className="rounded-full bg-background-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      Em breve
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                                  {p.resumo}
                                </span>
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/simulador"
                        className="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-[#021E34] p-5 text-white"
                      >
                        <img
                          src={fotoSrc("pay").src}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-1000 group-hover:scale-105"
                        />
                        <span className="relative text-sm text-white/80">Experimente agora</span>
                        <span className="relative mt-1 font-display text-xl font-medium leading-tight">
                          Pague a Mesa 12 no simulador →
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={linkCls}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              to="/entrar"
              className="hidden h-11 items-center rounded-full border border-border px-6 text-[0.95rem] font-medium text-foreground transition-colors hover:border-foreground/40 sm:inline-flex"
            >
              Entrar
            </Link>
            <a
              href="/teste-gratis"
              className="btn-tema hidden h-11 items-center rounded-full px-6 text-[0.95rem] font-medium sm:inline-flex"
            >
              Teste grátis
            </a>
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-controls="menu-mobile"
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface lg:hidden"
            >
              {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menu && (
          <div
            id="menu-mobile"
            className="menu-in fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-background px-5 pb-10 pt-4 lg:hidden"
          >
            <nav aria-label="Menu" className="flex flex-col">
              <p className="pb-2 pt-2 text-sm text-muted-foreground">Produtos</p>
              <ul className="grid grid-cols-2 gap-2 pb-4">
                {PRODUTOS.map((p) => (
                  <li key={p.slug}>
                    <a
                      href={`/produtos/${p.slug}`}
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2.5 rounded-2xl border border-border p-2"
                    >
                      <img
                        src={fotoSrc(p.foto).src}
                        alt=""
                        loading="lazy"
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                      <span className="text-sm font-medium leading-tight">{p.nome}</span>
                    </a>
                  </li>
                ))}
              </ul>
              {[...NAV, { href: "/#duvidas", label: "Dúvidas" }].map((n) => (
                <a
                  key={n.href + n.label}
                  href={n.href}
                  onClick={() => setMenu(false)}
                  className="border-b border-border py-4 font-display text-lg font-medium"
                >
                  {n.label}
                </a>
              ))}
              <Link
                to="/simulador"
                onClick={() => setMenu(false)}
                className="border-b border-border py-4 font-display text-lg font-medium"
              >
                Testar o simulador
              </Link>
            </nav>
            <div className="mt-6 grid gap-2">
              <a
                href="/teste-gratis"
                onClick={() => setMenu(false)}
                className="btn-tema flex h-12 items-center justify-center rounded-full font-medium"
              >
                Teste grátis
              </a>
              <Link
                to="/entrar"
                onClick={() => setMenu(false)}
                className="flex h-12 items-center justify-center rounded-full border border-border bg-surface font-medium"
              >
                Entrar
              </Link>
            </div>
          </div>
        )}
      </header>
      {/* Com o cabeçalho escondido, o CTA principal continua no topo (como na sunday). */}
      <a
        href="/teste-gratis"
        data-visivel={escondido || undefined}
        aria-hidden={!escondido}
        tabIndex={escondido ? undefined : -1}
        className="cta-fixo btn-tema fixed right-4 top-3 z-40 inline-flex h-11 items-center rounded-full px-6 text-[0.95rem] font-medium shadow-lift sm:right-6"
      >
        Teste grátis
      </a>
    </>
  );
}

export function LandingFooter() {
  const col = "space-y-2.5 text-sm";
  const a = "block text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer data-tema="claro" className="border-t border-border">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-8 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Pagamento na mesa por QR Code para restaurantes, bares e cafeterias.
          </p>
          <div className="mt-5 flex gap-2">
            <a
              href="https://instagram.com/tipe.digital"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @tipe.digital"
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={whatsappLink(WHATSAPP_SITE_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp da TIPE"
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className={col}>
          <p className="font-display font-medium">Produtos</p>
          {PRODUTOS.map((p) => (
            <a key={p.slug} href={`/produtos/${p.slug}`} className={a}>
              {p.nome}
            </a>
          ))}
          <a href="/integracoes" className={a}>
            Integrações
          </a>
          <Link to="/simulador" className={a}>
            Simulador
          </Link>
        </div>
        <div className={col}>
          <p className="font-display font-medium">Comercial</p>
          <a href="/precos" className={a}>
            Preços
          </a>
          <a href="/teste-gratis" className={a}>
            Teste grátis
          </a>
          <a href="/#duvidas" className={a}>
            Dúvidas frequentes
          </a>
          <a
            href={whatsappLink(WHATSAPP_SITE_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className={a}
          >
            Falar no WhatsApp
          </a>
          <Link to="/entrar" className={a}>
            Entrar
          </Link>
        </div>
        <div className={col}>
          <p className="font-display font-medium">Jurídico</p>
          <Link to="/legal/$livro" params={{ livro: "termos-de-uso" }} className={a}>
            Termos de Uso
          </Link>
          <Link to="/legal/$livro" params={{ livro: "privacidade" }} className={a}>
            Privacidade
          </Link>
          <Link to="/legal/$livro" params={{ livro: "cookies" }} className={a}>
            Cookies
          </Link>
          <Link to="/legal/$livro" params={{ livro: "parceiros" }} className={a}>
            Termos para Parceiros
          </Link>
          <Link
            to="/legal/$livro"
            params={{ livro: "seus-direitos" }}
            hash="solicitacao"
            className={a}
          >
            Seus direitos (LGPD)
          </Link>
          <PrivacyPreferences triggerClassName={a} />
        </div>
      </div>
      <div aria-hidden className="container-page overflow-hidden pb-4">
        <img src={logo} alt="" width={462} height={141} loading="lazy" className="logo-claro w-full" />
        <img src={logoBranco} alt="" width={462} height={141} loading="lazy" className="logo-escuro w-full" />
      </div>
      <div className="border-t border-border">
        <p className="container-page py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {COMPANY.legalName} · CNPJ {COMPANY.cnpj} · {COMPANY.city}
        </p>
      </div>
    </footer>
  );
}
