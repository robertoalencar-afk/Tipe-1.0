import { trackCta } from "@/lib/tipe/tracking";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Instagram, Menu, MessageCircle, X } from "lucide-react";
import logo from "@/assets/marca/tipe-logo.svg";
import logoBranco from "@/assets/marca/tipe-logo-branco.svg";
import { Focinho, SetaFios } from "@/components/tipe/site/Bigode";
import { LogoTipe } from "@/components/tipe/site/marca/LogoTipe";
import { LUZ } from "@/components/tipe/site/CardProduto";
import { fotoSrc } from "@/components/tipe/site/Foto";
import { CAMINHO_PRODUTO, GRUPOS, PRODUTOS } from "@/components/tipe/site/produtos";
import { seloDoProduto, useEstadosLancamento } from "@/components/tipe/site/useLancamento";
import { PrivacyPreferences } from "@/components/tipe/PrivacyPreferences";
import { COMPANY } from "@/lib/tipe/legal";
import { WHATSAPP_NUMBER, WHATSAPP_SITE_MESSAGE, whatsappLink } from "@/lib/tipe/contact";
import { cn } from "@/lib/utils";
import { useHeaderEscondido } from "./motion";

const NAV = [
  { href: "/lebre", label: "Lebre" },
  { href: "/integracoes", label: "Integrações" },
  { href: "/precos", label: "Planos" },
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
  const lancamento = useEstadosLancamento();
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

  const headerRef = useRef<HTMLElement>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
    if (!menu) return () => void (document.documentElement.style.overflow = "");
    // Menu do celular: foco vai para o primeiro link, Esc fecha e o Tab fica preso no cabeçalho.
    const header = headerRef.current;
    header?.querySelector<HTMLElement>("#menu-mobile a")?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        botaoMenu.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !header) return;
      const focaveis = [...header.querySelectorAll<HTMLElement>("a[href], button")].filter(
        (el) => el.offsetParent !== null,
      );
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro?.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => {
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", tecla);
    };
  }, [menu]);

  const linkCls =
    "rounded-full px-3.5 py-2 text-[0.95rem] font-medium text-foreground/85 transition-colors hover:text-foreground";
  return (
    <>
      <header
        ref={headerRef}
        data-escondido={escondido || undefined}
        className={cn(
          "header-auto sticky top-0",
          menu ? "z-[70]" : "z-40",
          // Com o menu aberto, nada de backdrop-filter: ele vira o bloco de contenção do painel fixed.
          menu
            ? "border-b border-border/70 bg-background"
            : scrolled
              ? "border-b border-border/70 bg-background"
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
                    <div className="grid grid-cols-[1fr_16rem] gap-3 rounded-[1.75rem] border border-border bg-background p-3 shadow-lift">
                      <div className="grid grid-cols-3 gap-2">
                        {GRUPOS.map((g) => (
                          <div key={g}>
                            <p className="px-2.5 pb-1 pt-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                              {g}
                            </p>
                            <ul>
                              {PRODUTOS.filter((p) => p.grupo === g).map((p) => (
                                <li key={p.slug}>
                                  <a
                                    href={CAMINHO_PRODUTO[p.slug]}
                                    onClick={() => setSolucoes(false)}
                                    className="group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-background-muted focus-visible:bg-background-muted"
                                  >
                                    <img
                                      src={fotoSrc(p.foto).src}
                                      alt=""
                                      loading="lazy"
                                      className="h-14 w-14 shrink-0 rounded-xl object-cover transition-transform duration-700 group-hover:scale-105"
                                      style={{ objectPosition: p.posicao }}
                                    />
                                    <span className="min-w-0">
                                      <span className="flex items-center gap-2 text-[0.95rem] font-medium">
                                        <span
                                          aria-hidden
                                          className="h-2 w-2 shrink-0 rounded-full"
                                          style={{ background: LUZ[p.slug] ?? "#0FC9BD" }}
                                        />
                                        {p.nome}
                                        {seloDoProduto(p, lancamento) && (
                                          <span className="rounded-full bg-background-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                            {seloDoProduto(p, lancamento)}
                                          </span>
                                        )}
                                      </span>
                                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                                        {p.resumo}
                                      </span>
                                    </span>
                                    <span
                                      aria-hidden
                                      className="com-fios ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                                      style={{ "--fio": LUZ[p.slug] ?? "#0FC9BD" } as CSSProperties}
                                    >
                                      <SetaFios className="meio-focinho-redondo" />
                                    </span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
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
                        <span className="com-fios relative mt-1 font-display text-xl font-medium leading-tight">
                          Pague a Mesa 12 no simulador <SetaFios />
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
              className="com-fios hidden h-11 items-center rounded-full border border-border px-6 text-[0.95rem] font-medium text-foreground transition-colors hover:border-foreground/40 sm:inline-flex"
            >
              Entrar
              <SetaFios seta={false} />
            </Link>
            <a
              href="/solicitar-demonstracao"
              onClick={() => trackCta("demonstracao_header")}
              className="btn-tema com-fios hidden h-11 items-center gap-2 rounded-full pl-6 pr-5 text-[0.95rem] font-medium sm:inline-flex"
            >
              Demonstração
              <SetaFios auto />
            </a>
            <button
              ref={botaoMenu}
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
            className="menu-cel fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col bg-background lg:hidden"
          >
            <nav aria-label="Menu" className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
              {GRUPOS.map((g, gi) => (
                <div key={g} className="pb-4">
                  <p
                    className="menu-item pb-2 pt-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
                    style={{ "--i": gi * 4 } as CSSProperties}
                  >
                    {g}
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {PRODUTOS.filter((p) => p.grupo === g).map((p, pi) => (
                      <li
                        key={p.slug}
                        className="menu-item"
                        style={{ "--i": gi * 4 + pi + 1 } as CSSProperties}
                      >
                        <a
                          href={CAMINHO_PRODUTO[p.slug]}
                          onClick={() => setMenu(false)}
                          className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-border p-2 transition-colors active:bg-background-muted"
                        >
                          <span className="relative shrink-0">
                            <img
                              src={fotoSrc(p.foto).src}
                              alt=""
                              loading="lazy"
                              className="h-11 w-11 rounded-xl object-cover"
                              style={{ objectPosition: p.posicao }}
                            />
                            <span
                              aria-hidden
                              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background"
                              style={{ background: LUZ[p.slug] ?? "#0FC9BD" }}
                            />
                          </span>
                          <span className="min-w-0 text-sm font-medium leading-tight">
                            {p.nome}
                            {seloDoProduto(p, lancamento) && (
                              <span className="block text-[11px] font-normal text-muted-foreground">
                                {seloDoProduto(p, lancamento)}
                              </span>
                            )}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="mt-2">
                {[
                  ...NAV.filter((n) => n.href !== "/lebre"),
                  { href: "/simulador", label: "Testar o simulador" },
                  { href: "/#duvidas", label: "Dúvidas" },
                ].map((n, k) => (
                  <a
                    key={n.href + n.label}
                    href={n.href}
                    onClick={() => setMenu(false)}
                    className="menu-item flex items-center justify-between border-b border-border py-4 font-display text-[1.35rem] font-normal tracking-[-0.02em]"
                    style={{ "--i": 12 + k } as CSSProperties}
                  >
                    {n.label}
                    <SetaFios className="text-muted-foreground" />
                  </a>
                ))}
              </div>
            </nav>
            <div
              className="menu-item grid grid-cols-2 gap-2 border-t border-border bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
              style={{ "--i": 16 } as CSSProperties}
            >
              <Link
                to="/entrar"
                onClick={() => setMenu(false)}
                className="com-fios flex h-12 items-center justify-center rounded-full border border-border bg-surface font-medium"
              >
                Entrar
                <SetaFios seta={false} />
              </Link>
              <a
                href="/solicitar-demonstracao"
                onClick={() => {
                  trackCta("demonstracao_menu_mobile");
                  setMenu(false);
                }}
                className="btn-tema com-fios flex h-12 items-center justify-center gap-2 rounded-full font-medium"
              >
                Demonstração
                <SetaFios auto />
              </a>
            </div>
          </div>
        )}
      </header>

    </>
  );
}

/** (85) 3179-0290 a partir de 558531790290 (fixo) ou (85) 9xxxx-xxxx (celular). */
function telefoneWhatsapp() {
  const n = WHATSAPP_NUMBER.replace(/^55/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  return n.length === 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}` : "WhatsApp";
}

/**
 * Rodapé E "Focinho vivo" (escolhido pelo Roberto em 26/10). O CTA final e o rodapé
 * viram uma peça só: um palco turquesa com o focinho grande da lebre, que fareja
 * sozinho, vira um pouco na direção do cursor e abre os bigodes quando o cursor ou o
 * foco chegam aos botões. Embaixo, o corpo navy com os links em quatro grupos e a
 * assinatura com o logotipo animado e a linha legal. Com movimento reduzido nada vira.
 */
export function LandingFooter() {
  const lancamento = useEstadosLancamento();
  const { pathname } = useLocation();
  const noTeste = pathname.startsWith("/solicitar-demonstracao");
  const grupo =
    "font-display text-[0.78rem] font-medium uppercase tracking-[0.14em] text-[#0FC9BD]";
  const a =
    "rodape-link inline-flex min-h-9 items-center text-[0.97rem] text-white/75 transition-colors duration-300 hover:text-white focus-visible:text-white";
  const zap = whatsappLink(WHATSAPP_SITE_MESSAGE);
  const palco = usePalcoFocinho();
  return (
    <footer data-tema="escuro" className="rodape relative isolate bg-[#021E34] text-white">
      <section
        ref={palco}
        aria-labelledby="rodape-titulo"
        className="rodape-palco relative overflow-hidden bg-[#0FC9BD] px-5 pb-14 pt-14 text-center text-[#021E34] sm:px-8 sm:pb-20 sm:pt-20"
      >
        <div className="rodape-focinho mx-auto w-[min(82vw,30rem)]">
          <Focinho tom="palco" delay={200} className="block h-auto w-full" />
        </div>
        <h2
          id="rodape-titulo"
          className="mt-6 font-display text-[clamp(3rem,1.6rem+6vw,7.4rem)] font-normal leading-[0.92] tracking-[-0.055em]"
        >
          Pague. <br className="sm:hidden" />
          Sem esperar.
        </h2>
        <p className="mx-auto mt-6 max-w-[36ch] text-[1.05rem] leading-relaxed text-[#021E34]/75 sm:text-lg">
          Conta na mesa por QR Code para restaurantes, bares e cafeterias. Conheça os planos.
        </p>
        <div className="rodape-ctas mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          {!noTeste && (
            <a
              href="/solicitar-demonstracao"
              onClick={() => trackCta("demonstracao_final")}
              className="com-fios inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-[#021E34] pl-8 pr-7 text-lg font-medium text-white transition-colors hover:bg-[#06304f]"
            >
              Solicitar demonstração
              <SetaFios />
            </a>
          )}
          <a
            href={zap}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full px-7 text-lg font-medium text-[#021E34] ring-[1.5px] ring-inset ring-[#021E34]/40 transition-colors hover:bg-white/30"
          >
            <MessageCircle aria-hidden className="h-5 w-5" />
            Falar no WhatsApp
          </a>
        </div>
      </section>

      <div className="container-page pt-14 sm:pt-20">
        <nav
          aria-label="Rodapé"
          className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-x-10"
        >
          <div>
            <p className={grupo}>Produtos</p>
            <ul className="mt-4 space-y-0.5">
              {PRODUTOS.map((p) => (
                <li key={p.slug}>
                  <a href={CAMINHO_PRODUTO[p.slug]} className={a}>
                    {p.nome}
                    {seloDoProduto(p, lancamento) && (
                      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                        {seloDoProduto(p, lancamento)}
                      </span>
                    )}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/simulador" className={a}>
                  Simulador
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={grupo}>Empresa</p>
            <ul className="mt-4 space-y-0.5">
              <li>
                <a href="/integracoes" className={a}>
                  Integrações
                </a>
              </li>
              <li>
                <a href="/precos" className={a}>
                  Planos
                </a>
              </li>
              <li>
                <a href="/solicitar-demonstracao" className={a}>
                  Demonstração
                </a>
              </li>
              <li>
                <a href="/restaurante-fundador" className={a}>
                  Restaurante Fundador
                </a>
              </li>
              <li>
                <a href="/ajuda" className={a}>
                  Central de ajuda
                </a>
              </li>
              <li>
                <Link to="/entrar" className={a}>
                  Entrar
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={grupo}>Legal</p>
            <ul className="mt-4 space-y-0.5">
              <li>
                <Link to="/legal/$livro" params={{ livro: "termos-de-uso" }} className={a}>
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/legal/$livro" params={{ livro: "privacidade" }} className={a}>
                  Privacidade
                </Link>
              </li>
              <li>
                <Link to="/legal/$livro" params={{ livro: "cookies" }} className={a}>
                  Cookies
                </Link>
              </li>
              <li>
                <Link to="/legal/$livro" params={{ livro: "parceiros" }} className={a}>
                  Termos para Parceiros
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/$livro"
                  params={{ livro: "seus-direitos" }}
                  hash="solicitacao"
                  className={a}
                >
                  Seus direitos (LGPD)
                </Link>
              </li>
              <li>
                <PrivacyPreferences triggerClassName={cn(a, "text-left")} />
              </li>
            </ul>
          </div>
          <div>
            <p className={grupo}>Contato</p>
            <ul className="mt-4 space-y-0.5">
              <li>
                <a href={zap} target="_blank" rel="noopener noreferrer" className={cn(a, "gap-2")}>
                  <MessageCircle aria-hidden className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="sr-only">WhatsApp </span>
                    {telefoneWhatsapp()}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/tipe.digital"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(a, "gap-2")}
                >
                  <Instagram aria-hidden className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="sr-only">Instagram </span>@tipe.digital
                  </span>
                </a>
              </li>
              <li className="flex min-h-9 items-center text-[0.97rem] text-white/60">
                {COMPANY.city}
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="container-page">
        <div className="mt-14 flex flex-col gap-5 border-t border-white/12 py-7 text-xs leading-relaxed text-white/60 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <LogoTipe tom="escuro" titulo="Tipe" className="block h-auto w-24 shrink-0" />
            <p>
              © {new Date().getFullYear()} {COMPANY.legalName} · CNPJ {COMPANY.cnpj} ·{" "}
              {COMPANY.city}
            </p>
          </div>
          <a
            href="#top"
            className="inline-flex min-h-9 items-center gap-1.5 self-start text-white/70 hover:text-white sm:self-auto"
          >
            Voltar ao topo
            <ArrowRight aria-hidden className="h-3.5 w-3.5 -rotate-90" />
          </a>
        </div>
      </div>
    </footer>
  );
}

/**
 * Liga o palco do rodapé: --rx/--ry (-1 a 1) seguem o cursor para o focinho virar um
 * pouco; data-aberto quando o cursor ou o foco estão nos botões (bigodes abertos).
 */
function usePalcoFocinho() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctas = el.querySelector(".rodape-ctas");
    let quadro = 0;
    const mover = (e: PointerEvent) => {
      if (reduz || quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const y = (e.clientY - (r.top + r.height * 0.3)) / (r.height / 2);
        el.style.setProperty("--rx", Math.max(-1, Math.min(1, x)).toFixed(3));
        el.style.setProperty("--ry", Math.max(-1, Math.min(1, y)).toFixed(3));
      });
    };
    const sair = () => {
      el.style.setProperty("--rx", "0");
      el.style.setProperty("--ry", "0");
    };
    const abrir = () => el.setAttribute("data-aberto", "");
    const fechar = () => el.removeAttribute("data-aberto");
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", sair);
    ctas?.addEventListener("pointerover", abrir);
    ctas?.addEventListener("pointerout", fechar);
    ctas?.addEventListener("focusin", abrir);
    ctas?.addEventListener("focusout", fechar);
    return () => {
      cancelAnimationFrame(quadro);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", sair);
      ctas?.removeEventListener("pointerover", abrir);
      ctas?.removeEventListener("pointerout", fechar);
      ctas?.removeEventListener("focusin", abrir);
      ctas?.removeEventListener("focusout", fechar);
    };
  }, []);
  return ref;
}
