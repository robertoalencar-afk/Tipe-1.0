import { MenuPublicationsCarousel } from "./MenuPublicacoes";
import lebreAvatar from "@/assets/lebre/avatar-feliz.webp";
import { PromocoesHoje } from "./PromocoesHoje";
import { AcompanhamentosCliente } from "./AcompanhamentosCliente";
import { createPortal } from "react-dom";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Search, UtensilsCrossed } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPublicMenu,
  placeCustomerOrder,
  getCustomerOrderReview,
  type PublicMenu,
} from "@/lib/tipe/customer-order.functions";
import { totalCarrinho, carrinhoParaPedido } from "@/lib/tipe/pdv/comanda";
import {
  dietLabels,
  menuLanguages,
  filterMenu,
  relatedItems,
  translatedItem,
  type MenuLanguage,
} from "@/lib/tipe/menu-intelligence";
import { recordMenuInteraction } from "@/lib/tipe/menu-intelligence.functions";
import { hasConsent } from "@/lib/tipe/consent";

const copy = {
  pt: {
    search: "Buscar pratos, ingredientes ou categorias",
    all: "Tudo",
    featured: "Destaques da casa",
    lebre: "A Lebre indica",
    lebreWhy: "Por que a Lebre indica",
    other: "Outros produtos",
    diet: "Todas as opções",
    dietary:
      "Informações alimentares declaradas pelo restaurante. Em caso de alergia, confirme com a equipe.",
    none: "Nenhum item encontrado.",
    pair: "Combina bem com",
    extras: "Adicionais",
    versions: "Outras versões",
    add: "Adicionar",
    allergies: "Alergênicos informados",
    instagram: "Nosso Instagram",
    reviews: "Avalie sua experiência",
    enlarge: "Aumentar letras",
  },
  en: {
    search: "Search dishes, ingredients or categories",
    all: "All",
    featured: "House highlights",
    lebre: "Lebre recommends",
    lebreWhy: "Why Lebre recommends it",
    other: "Other items",
    diet: "All options",
    dietary:
      "Dietary information provided by the restaurant. If you have an allergy, check with the staff.",
    none: "No items found.",
    pair: "Pairs well with",
    extras: "Extras",
    versions: "Other versions",
    add: "Add",
    allergies: "Declared allergens",
    instagram: "Our Instagram",
    reviews: "Review your experience",
    enlarge: "Larger text",
  },
  es: {
    search: "Buscar platos, ingredientes o categorías",
    all: "Todo",
    featured: "Destacados de la casa",
    lebre: "La Lebre recomienda",
    lebreWhy: "Por qué la Lebre lo recomienda",
    other: "Otros productos",
    diet: "Todas las opciones",
    dietary:
      "Información alimentaria proporcionada por el restaurante. En caso de alergia, consulte al personal.",
    none: "No se encontraron productos.",
    pair: "Combina bien con",
    extras: "Adicionales",
    versions: "Otras versiones",
    add: "Añadir",
    allergies: "Alérgenos declarados",
    instagram: "Nuestro Instagram",
    reviews: "Evalúa tu experiencia",
    enlarge: "Letras más grandes",
  },
};
const dietsByLanguage = {
  pt: dietLabels,
  en: {
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    gluten_free: "Gluten-free",
    lactose_free: "Lactose-free",
  },
  es: {
    vegetarian: "Vegetariano",
    vegan: "Vegano",
    gluten_free: "Sin gluten",
    lactose_free: "Sin lactosa",
  },
};

const StoryCardapio = lazy(() =>
  import("@/components/tipe/site/order/StoryCardapio").then((m) => ({ default: m.StoryCardapio })),
);
const AneisCategorias = lazy(() =>
  import("@/components/tipe/site/order/StoryCardapio").then((m) => ({
    default: m.AneisCategorias,
  })),
);

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Cardápio digital do cliente: pede pela própria mesa, cai no KDS e na conta. */
export function MesaPedido({
  slug,
  code,
  session,
  nome,
  device,
  onPlaced,
  onBlocked,
  podeEnviar = true,
  preview = false,
}: {
  /** Prévia na Gestão: não envia pedido e não conta interações. */
  preview?: boolean | undefined;
  slug: string;
  code: string;
  session: string;
  nome: string;
  /** Token deste celular quando a mesa pede código curto. */
  device?: string | undefined;
  onPlaced: () => void | Promise<void>;
  /** A mesa deixou de estar liberada (ou falta o código): a tela volta para a liberação. */
  onBlocked?: ((motivo: "closed" | "code") => void) | undefined;
  /** Falso enquanto a mesa não foi liberada: dá para montar o pedido, mas não enviar. */
  podeEnviar?: boolean | undefined;
}) {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cat, setCat] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [language, setLanguage] = useState<MenuLanguage>("pt");
  const [diet, setDiet] = useState("");
  const [fontSize, setFontSize] = useState(1);
  const [fontOptions, setFontOptions] = useState(false);
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [sides, setSides] = useState<Record<string, string[]>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [obsAberta, setObsAberta] = useState<string | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<{
    itens: number;
    reviewId?: string;
    reviewState?: string;
  } | null>(null);
  const requestId = useRef(nanoid(16));
  const labels = copy[language];

  function track(itemCode: string, event: "photo_open" | "add") {
    if (preview || !hasConsent("analytics")) return;
    const item = menu?.items.find((i) => i.code === itemCode);
    if (item)
      void recordMenuInteraction({ data: { slug, itemId: item.id, event, consent: true } }).catch(
        () => {},
      );
  }
  useEffect(() => {
    if (story) track(story, "photo_open");
    // Only the opening is counted, never scrolling or each animation frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  useEffect(() => {
    let vivo = true;
    void getPublicMenu({ data: { slug } })
      .then((r) => {
        if (!vivo) return;
        if ("error" in r) setErro("Não foi possível carregar o cardápio.");
        else setMenu(r);
      })
      .catch(() => vivo && setErro("Não foi possível carregar o cardápio."));
    return () => {
      vivo = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!enviado?.reviewId || enviado.reviewState !== "pending") return;
    let active = true;
    const id = enviado.reviewId;
    const poll = async () => {
      try {
        const r = await getCustomerOrderReview({ data: { slug, code, session, id } });
        if (!active) return;
        setEnviado((prev) => (prev?.reviewId === id ? { ...prev, reviewState: r.state } : prev));
        if (r.state === "approved") await onPlaced();
      } catch {
        /* mantém a espera e tenta na próxima consulta */
      }
    };
    const timer = window.setInterval(() => void poll(), 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enviado?.reviewId, enviado?.reviewState, slug, code, session, onPlaced]);

  const precoDe = useMemo(() => {
    const m = new Map((menu?.items ?? []).map((i) => [i.code, i.price]));
    return (c: string) => m.get(c) ?? 0;
  }, [menu]);

  if (erro && !menu)
    return <p className="rounded-2xl border border-border bg-card p-4 text-sm">{erro}</p>;
  if (!menu)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">Carregando o cardápio…</p>
    );
  if (!menu.selfOrder)
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-sm">
        O pedido pela mesa não está disponível. Chame o garçom.
      </p>
    );

  if (enviado) {
    const esperando = enviado.reviewState === "pending";
    const recusado = enviado.reviewState === "rejected" || enviado.reviewState === "expired";
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-extrabold">
          {esperando
            ? "Vamos confirmar na mesa"
            : recusado
              ? "Pedido não enviado à cozinha"
              : "Pedido enviado!"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {esperando
            ? `Seu pedido de ${enviado.itens} itens está aguardando a conferência de um garçom na mesa. O preparo começa após a confirmação.`
            : recusado
              ? "Este pedido foi recusado ou expirou. Converse com o garçom antes de enviar novamente."
              : `${enviado.itens} itens foram para a cozinha. Em instantes aparecem na sua conta.`}
        </p>
        {!esperando && (
          <Button
            className="mt-1 w-full"
            onClick={() => {
              setEnviado(null);
              requestId.current = nanoid(16);
            }}
          >
            {recusado ? "Voltar ao cardápio" : "Pedir mais"}
          </Button>
        )}
      </div>
    );
  }

  const linhas = carrinhoParaPedido(carrinho, obs).map((line) => ({
    ...line,
    sides: sides[line.code] ?? [],
  }));
  const pendingChoices = linhas.filter((line) => {
    const config = menu.items.find((i) => i.code === line.code)?.config?.accompaniments;
    return (
      config?.enabled &&
      (line.sides.length < config.min ||
        line.sides.length > config.max ||
        line.sides.some(
          (code) =>
            !menu.items.some((i) => i.code === code) ||
            !config.choices.some((c) => c.code === code),
        ))
    );
  });
  const extraTotal = linhas.reduce((sum, line) => {
    const config = menu.items.find((i) => i.code === line.code)?.config?.accompaniments;
    return (
      sum +
      (config?.enabled
        ? line.sides.reduce(
            (price, code) =>
              price + (config.choices.find((c) => c.code === code)?.included ? 0 : precoDe(code)),
            0,
          ) * line.qty
        : 0)
    );
  }, 0);
  const total = totalCarrinho(linhas, precoDe) + extraTotal;
  const qtdTotal = linhas.reduce((sum, line) => {
    const cfg = menu.items.find((i) => i.code === line.code)?.config?.accompaniments;
    const paid = cfg?.enabled
      ? line.sides.filter((code) => cfg.choices.some((c) => c.code === code && !c.included)).length
      : 0;
    return sum + line.qty * (1 + paid);
  }, 0);
  const add = (c: string, d: number) => {
    if (d > 0 && menu.items.find((i) => i.code === c)?.config?.accompaniments?.enabled) {
      setStory(null);
      setCat("");
      setBusca("");
      setDiet("");
      window.setTimeout(
        () =>
          document.getElementById(`choices-${c}`)?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
            block: "center",
          }),
        100,
      );
    }
    if (d > 0 && (carrinho[c] ?? 0) < 99) track(c, "add");
    setCarrinho((x) => ({ ...x, [c]: Math.max(0, Math.min(99, (x[c] ?? 0) + d)) }));
  };
  const displayItems = menu.items.map((i) => translatedItem(i, language));
  const itens = filterMenu(
    displayItems,
    busca,
    cat,
    diet,
    (id) => menu.categories.find((c) => c.id === id)?.name ?? "",
  );
  const pinned = !cat && !busca;
  const hasLebre = pinned && itens.some((i) => i.config?.lebrePick);
  const hasHighlights =
    pinned && itens.some((i) => i.config?.featured && !(hasLebre && i.config?.lebrePick));
  const groups = [
    ...(hasLebre ? [{ id: "__lebre", name: labels.lebre }] : []),
    ...(hasHighlights ? [{ id: "__featured", name: labels.featured }] : []),
    ...menu.categories,
    { id: "__other", name: labels.other },
  ];

  const temFotos = menu.items.some((i) => i.imageUrl);
  const itensStory = displayItems
    .filter((i) => !diet || i.config?.diets.includes(diet as keyof typeof dietLabels))
    .map((i) => ({
      code: i.code,
      nome: i.name,
      preco: Math.round(i.price * 100),
      cat: menu.categories.find((c) => c.id === i.categoryId)?.name ?? "Cardápio",
      ...(i.description ? { desc: i.description } : {}),
      ...(i.imageUrl ? { foto: i.imageUrl } : {}),
      ...(i.depthUrl ? { profundidade: i.depthUrl } : {}),
      ...(i.modelUrl ? { modelo: i.modelUrl } : {}),
      ...(i.badge || i.config?.lebrePick ? { selo: i.badge || labels.lebre } : {}),
      ...(i.config?.diets.length
        ? { dietas: i.config.diets.map((d) => dietsByLanguage[language][d]) }
        : {}),
      ...(i.allergens.length ? { alergenicos: i.allergens } : {}),
    }));

  async function enviar() {
    if (!linhas.length || !podeEnviar) return;
    if (pendingChoices.length) {
      setCat("");
      setBusca("");
      setDiet("");
      setErro("Escolha os acompanhamentos dos pratos antes de enviar.");
      window.setTimeout(
        () =>
          document
            .getElementById(`choices-${pendingChoices[0]!.code}`)
            ?.scrollIntoView({ block: "center" }),
        100,
      );
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const r = await placeCustomerOrder({
        data: {
          slug,
          code,
          session,
          requestId: requestId.current,
          ...(nome.trim() ? { customer: nome.trim() } : {}),
          ...(device ? { device } : {}),
          items: linhas,
        },
      });
      if ("error" in r) {
        if ((r.error === "closed" || r.error === "code") && onBlocked) {
          onBlocked(r.error);
          return;
        }
        setErro(
          r.error === "choices"
            ? "Confira os acompanhamentos: respeite os limites e escolha apenas opções disponíveis. Se o cardápio mudou, atualize a página."
            : r.error === "disabled"
              ? "O pedido pela mesa foi desativado pelo restaurante. A sua conta continua em Pagar."
              : r.error === "unavailable"
                ? "Esta mesa está indisponível. Chame o garçom."
                : "Não foi possível enviar o pedido. Tente de novo.",
        );
        return;
      }
      setCarrinho({});
      setSides({});
      setObs({});
      setEnviado({
        itens: r.items,
        ...(r.reviewId ? { reviewId: r.reviewId, reviewState: r.reviewState } : {}),
      });
      await onPlaced();
    } catch {
      setErro("Não foi possível enviar o pedido. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      lang={language}
      className={`pb-28 ${fontSize === 2 ? "[&_p]:!text-lg [&_button]:!text-base [&_input]:!text-lg" : fontSize === 0 ? "[&_p]:!text-sm" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Idioma / Language" className="flex flex-wrap gap-1">
          {menuLanguages
            .filter((l) => (menu?.languages ?? ["pt"]).includes(l.id))
            .map((l) => (
              <button
                key={l.id}
                type="button"
                aria-label={l.name}
                title={l.name}
                aria-pressed={language === l.id}
                onClick={() => setLanguage(l.id)}
                className={`min-h-11 rounded-xl px-3 text-sm font-medium ${language === l.id ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
              >
                <span aria-hidden="true" className="text-xl">
                  {l.flag}
                </span>
              </button>
            ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={labels.enlarge}
            title={labels.enlarge}
            aria-expanded={fontOptions}
            onClick={() => setFontOptions(!fontOptions)}
            className="min-h-11 min-w-11 rounded-xl border border-border px-3 font-semibold"
          >
            Aa
          </button>
          {fontOptions && (
            <div role="group" aria-label={labels.enlarge} className="flex gap-1">
              {["A−", "A", "A+"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`${labels.enlarge}: ${label}`}
                  aria-pressed={fontSize === index}
                  onClick={() => setFontSize(index)}
                  className={`min-h-11 min-w-11 rounded-xl border border-border px-2 ${fontSize === index ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <MenuPublicationsCarousel posts={menu.posts ?? []} items={displayItems} onOpen={setStory} />
      {language === "pt" && (
        <PromocoesHoje promos={menu.promos ?? []} items={displayItems} onOpen={setStory} />
      )}
      <label className="flex items-center gap-2 rounded-xl border border-input bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{labels.search}</span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={labels.search}
          className="h-11 w-full bg-transparent text-sm outline-none"
        />
      </label>
      <label className="mt-3 block">
        <span className="sr-only">{labels.diet}</span>
        <select
          value={diet}
          onChange={(e) => {
            setDiet(e.target.value);
            setStory(null);
          }}
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="">{labels.diet}</option>
          {Object.entries(dietsByLanguage[language]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-muted-foreground">{labels.dietary}</p>
      {temFotos && (
        <Suspense fallback={<div className="mt-3 h-[5.5rem]" />}>
          <div className="mt-3">
            <AneisCategorias
              itens={itensStory}
              categorias={menu.categories
                .filter((c) => itensStory.some((i) => i.cat === c.name && i.foto))
                .map((c) => c.name)}
              abrir={(c) => setStory(itensStory.find((i) => i.cat === c && i.foto)?.code ?? null)}
            />
          </div>
        </Suspense>
      )}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        <Chip on={!cat} onClick={() => setCat("")}>
          {labels.all}
        </Chip>
        {menu.categories.map((c) => (
          <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      <div className="mt-3 space-y-5">
        {groups.map((c) => {
          const isLebre = (i: (typeof itens)[number]) => hasLebre && !!i.config?.lebrePick;
          const lista = itens.filter((i) =>
            c.id === "__lebre"
              ? isLebre(i)
              : c.id === "__featured"
                ? i.config?.featured && !isLebre(i)
                : (c.id === "__other"
                    ? !menu.categories.some((cat) => cat.id === i.categoryId)
                    : i.categoryId === c.id) &&
                  !(hasHighlights && i.config?.featured) &&
                  !isLebre(i),
          );
          if (!lista.length) return null;
          return (
            <section key={c.id}>
              {c.id === "__lebre" ? (
                <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-[#021E34] dark:text-[#2ED3B7]">
                  <img src={lebreAvatar} alt="" className="size-6 rounded-full bg-[#2ED3B7]/20" />
                  {c.name}
                </h3>
              ) : (
                <h3 className="mb-2 font-display text-sm font-bold text-muted-foreground">
                  {c.name}
                </h3>
              )}
              <ul className="flex flex-col gap-3">
                {lista.map((i) => {
                  const q = carrinho[i.code] ?? 0;
                  return (
                    <li
                      key={i.id}
                      className={`overflow-hidden rounded-2xl border bg-card ${i.imageUrl ? "p-0" : "p-3"} ${q > 0 ? "border-2 border-primary" : "border-border"}`}
                    >
                      {i.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setStory(i.code)}
                          aria-label={`Ver ${i.name} em tela cheia`}
                          className="group relative block h-36 w-full overflow-hidden bg-muted sm:h-44"
                        >
                          <img
                            src={i.imageUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-active:scale-105"
                          />
                          <span
                            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent"
                            aria-hidden="true"
                          />
                          <span className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                            {i.config?.lebrePick && (
                              <span className="flex items-center gap-1.5 rounded-full bg-[#021E34]/90 py-0.5 pl-0.5 pr-2.5 text-[10px] font-bold uppercase tracking-wide text-[#2ED3B7]">
                                <img
                                  src={lebreAvatar}
                                  alt=""
                                  className="size-5 rounded-full bg-[#2ED3B7]/25"
                                />
                                {labels.lebre}
                              </span>
                            )}
                            {i.badge && (
                              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#021E34]">
                                {i.badge}
                              </span>
                            )}
                          </span>
                          {(i.depthUrl || i.modelUrl) && (
                            <span className="absolute right-3 top-3 rounded-full bg-[#021E34]/85 px-2 py-1 text-[10px] font-bold text-[#0FC9BD]">
                              {i.modelUrl ? "3D" : "Foto 3D"}
                            </span>
                          )}
                          <span className="absolute bottom-2.5 left-3 text-[11px] font-medium text-white/90">
                            Toque para ver em tela cheia
                          </span>
                        </button>
                      )}
                      <div
                        className={`flex items-start justify-between gap-3 ${i.imageUrl ? "p-3.5" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {i.name}
                            {!i.imageUrl && i.badge && (
                              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-primary">
                                {i.badge}
                              </span>
                            )}
                          </p>
                          {!i.imageUrl && i.config?.lebrePick && (
                            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                              <img src={lebreAvatar} alt="" className="size-5 rounded-full" />
                              {labels.lebre}
                            </p>
                          )}
                          {i.description && (
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                              {i.description}
                            </p>
                          )}
                          {i.config?.lebrePick && (
                            <p className="mt-2 rounded-xl bg-[#2ED3B7]/10 px-3 py-2 text-xs leading-relaxed text-foreground">
                              <span className="font-semibold">{labels.lebreWhy}:</span>{" "}
                              {i.config.lebrePick.reason}
                            </p>
                          )}
                          {!!i.config?.diets.length && (
                            <p className="mt-1 text-xs text-primary">
                              {i.config.diets.map((d) => dietsByLanguage[language][d]).join(" · ")}
                            </p>
                          )}
                          {i.allergens.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {labels.allergies}: {i.allergens.join(", ")}
                            </p>
                          )}
                          <p className="mt-1 text-sm font-bold">{money(i.price)}</p>
                        </div>
                        {q > 0 ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              aria-label={`Menos um ${i.name}`}
                              onClick={() => add(i.code, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center font-bold tabular-nums">{q}</span>
                            <Button
                              size="icon"
                              className="h-9 w-9"
                              aria-label={`Mais um ${i.name}`}
                              onClick={() => add(i.code, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            aria-label={`Adicionar ${i.name}`}
                            onClick={() => add(i.code, 1)}
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                      {q > 0 && i.config?.accompaniments?.enabled && (
                        <div id={`choices-${i.code}`} className="scroll-mt-24 px-3.5 pb-3.5">
                          <AcompanhamentosCliente
                            config={i.config.accompaniments}
                            items={displayItems}
                            selected={sides[i.code] ?? []}
                            onChange={(codes) =>
                              setSides((current) => ({ ...current, [i.code]: codes }))
                            }
                            language={language}
                            quantity={q}
                          />
                        </div>
                      )}
                      {q > 0 && i.config && (
                        <div className="space-y-3 px-3.5 pb-3.5">
                          {(
                            [
                              ["recommendations", labels.pair],
                              ["addons", labels.extras],
                              ["variants", labels.versions],
                            ] as const
                          ).map(([key, title]) => {
                            const related = relatedItems(
                              i.config![key],
                              displayItems.filter(
                                (j) =>
                                  !diet ||
                                  j.config?.diets.includes(diet as keyof typeof dietLabels),
                              ),
                              i.code,
                            );
                            return related.length ? (
                              <div key={key}>
                                <h4 className="mb-1 text-xs font-bold">{title}</h4>
                                <div className="flex flex-col gap-2">
                                  {related.map((j) => (
                                    <button
                                      key={j.code}
                                      type="button"
                                      disabled={(carrinho[j.code] ?? 0) >= 99}
                                      onClick={() => add(j.code, 1)}
                                      className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-left text-sm"
                                    >
                                      <span>
                                        {j.name}
                                        <span className="ml-1 text-xs text-muted-foreground">
                                          {(carrinho[j.code] ?? 0) > 0
                                            ? `(${carrinho[j.code]})`
                                            : ""}
                                        </span>
                                      </span>
                                      <span className="shrink-0 font-semibold">
                                        {labels.add} · {money(j.price)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className={i.imageUrl && q > 0 ? "px-3.5 pb-3.5" : ""}>
                        {q > 0 &&
                          (obsAberta === i.code ? (
                            <Input
                              autoFocus
                              className="mt-2 h-10 text-sm"
                              maxLength={140}
                              placeholder="Observação (ex.: sem cebola)"
                              value={obs[i.code] ?? ""}
                              onChange={(e) => setObs({ ...obs, [i.code]: e.target.value })}
                              onBlur={() => setObsAberta(null)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setObsAberta(i.code)}
                              className="mt-2 text-xs font-semibold text-primary"
                            >
                              {obs[i.code]?.trim()
                                ? `Obs.: ${obs[i.code]}`
                                : "+ Adicionar observação"}
                            </button>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {itens.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{labels.none}</p>
        )}
      </div>
      {(menu.links?.instagram || menu.links?.reviews) && (
        <nav
          aria-label="Links do restaurante"
          className="mt-6 flex flex-wrap gap-3 border-t border-border pt-4 text-sm font-semibold"
        >
          {menu.links.instagram && (
            <a
              href={menu.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border px-3 py-2"
            >
              {labels.instagram} ↗
            </a>
          )}
          {menu.links.reviews && (
            <a
              href={menu.links.reviews}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border px-3 py-2"
            >
              {labels.reviews} ↗
            </a>
          )}
        </nav>
      )}

      {erro && (
        <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {erro}
        </p>
      )}

      {story &&
        typeof document !== "undefined" &&
        createPortal(
          <Suspense fallback={null}>
            <StoryCardapio
              itens={itensStory}
              categorias={menu.categories.map((c) => c.name)}
              inicio={story}
              restaurante={menu.restaurantName}
              carrinho={carrinho}
              mudar={add}
              onFechar={() => setStory(null)}
              tela
            />
          </Suspense>,
          document.body,
        )}

      {linhas.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-card p-3">
          <Button
            className="h-14 w-full text-base font-bold"
            disabled={enviando || !podeEnviar}
            onClick={enviar}
          >
            {enviando ? (
              "Enviando…"
            ) : (
              <>
                <UtensilsCrossed className="mr-2 h-5 w-5" />
                {pendingChoices.length ? "Escolher acompanhamentos · " : "Enviar "}
                {qtdTotal} {qtdTotal === 1 ? "item" : "itens"} · {money(total)}
              </>
            )}
          </Button>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            {podeEnviar
              ? qtdTotal > 5
                ? "Pedidos com mais de 5 itens aguardam a confirmação de um garçom na mesa antes do preparo."
                : "O pedido vai direto para a cozinha e entra na sua conta."
              : "Seu pedido fica guardado aqui. Envie assim que a mesa for liberada."}
          </p>
        </div>
      )}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
    >
      {children}
    </button>
  );
}
