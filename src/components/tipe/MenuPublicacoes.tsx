import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LebreSuggestionButton } from "./LebreSuggestionButton";
import { getMenuPosts, saveMenuPosts, suggestMenuPosts } from "@/lib/tipe/menu-posts.functions";
import {
  MENU_POST_TAGS,
  WEEKDAYS,
  postDaysLabel,
  postShowsOn,
  type MenuPost,
} from "@/lib/tipe/menu-posts";
import { daysLabel, SEE_DISH, TAG_LABELS } from "@/lib/tipe/menu-i18n";
import type { MenuLanguage } from "@/lib/tipe/menu-intelligence";
import { useMovimentoReduzido } from "./site/produto/useVisivel";
type Item = { code: string; name: string; imageUrl: string | null };
export function PublicationArt({
  post,
  item,
  language = "pt",
}: {
  post: MenuPost;
  item: Item;
  language?: MenuLanguage;
}) {
  const paper = post.theme === "paper";
  const days = language === "pt" ? postDaysLabel(post.days) : daysLabel(post.days, language);
  return (
    <div
      className={`relative isolate flex h-full min-h-60 overflow-hidden rounded-2xl sm:min-h-64 ${paper ? "bg-[#F6F1E7] text-[#021E34]" : "bg-[#021E34] text-white"}`}
    >
      <img
        src={item.imageUrl!}
        alt={item.name}
        loading="lazy"
        className={
          paper
            ? "absolute inset-y-0 right-0 -z-10 h-full w-[46%] object-cover"
            : "absolute inset-0 -z-10 h-full w-full object-cover"
        }
      />
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 ${paper ? "bg-gradient-to-r from-[#F6F1E7] from-50% via-[#F6F1E7]/70 via-[56%] to-transparent to-[70%]" : "bg-gradient-to-tr from-black/90 via-black/55 to-black/5"}`}
      />
      <div
        className={`flex min-h-60 flex-col justify-between gap-4 p-5 sm:min-h-64 sm:p-7 ${paper ? "w-[60%]" : "w-full max-w-[34rem]"}`}
      >
        {post.tag || days ? (
          <p className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
            {post.tag && (
              <span
                className={`rounded-full px-2.5 py-1 ${paper ? "bg-[#021E34] text-white" : "bg-[#2ED3B7] text-[#021E34]"}`}
              >
                {TAG_LABELS[language][post.tag]}
              </span>
            )}
            {days && <span className={paper ? "text-[#021E34]/70" : "text-white/80"}>{days}</span>}
          </p>
        ) : (
          <span />
        )}
        <div>
          <p className="font-display text-[1.7rem] font-semibold leading-[1.05] tracking-tight sm:text-4xl">
            {post.title}
          </p>
          {post.caption && (
            <p
              className={`mt-3 line-clamp-3 text-sm leading-relaxed ${paper ? "text-[#021E34]/80" : "text-white/85"}`}
            >
              {post.caption}
            </p>
          )}
          <span
            className={`mt-4 inline-flex items-center gap-1 border-b pb-0.5 text-xs font-semibold ${paper ? "border-[#021E34]/40" : "border-white/50"}`}
          >
            {SEE_DISH[language]} {item.name} <ChevronRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </div>
  );
}
export function MenuPublicationsCarousel({
  posts,
  items,
  onOpen,
  language = "pt",
}: {
  posts: MenuPost[];
  items: Item[];
  onOpen: (code: string) => void;
  language?: MenuLanguage;
}) {
  const today = new Date().getDay();
  const available = posts.filter(
    (p) =>
      p.enabled && postShowsOn(p, today) && items.some((i) => i.code === p.itemCode && i.imageUrl),
  );
  const [active, setActive] = useState(0),
    [paused, setPaused] = useState(false),
    [hover, setHover] = useState(false);
  const reduced = useMovimentoReduzido();
  const track = useRef<HTMLDivElement>(null);
  const go = useCallback(
    (index: number) => {
      if (!available.length) return;
      const next = (index + available.length) % available.length;
      setActive(next);
      const el = track.current;
      el?.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "instant" : "smooth" });
    },
    [available.length, reduced],
  );
  useEffect(() => {
    if (paused || hover || reduced || available.length < 2) return;
    const t = setInterval(() => {
      if (!document.hidden) go(active + 1);
    }, 6500);
    return () => clearInterval(t);
  }, [paused, hover, reduced, active, available.length, go]);
  if (!available.length) return null;
  return (
    <section
      aria-label="Publicações do restaurante"
      aria-roledescription="carrossel"
      className="mb-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHover(false);
      }}
    >
      <div
        ref={track}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none]"
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {available.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p.itemCode)}
            className="w-full shrink-0 snap-start text-left"
            aria-label={`Ver prato: ${p.title}`}
          >
            <PublicationArt
              post={p}
              item={items.find((i) => i.code === p.itemCode)!}
              language={language}
            />
          </button>
        ))}
      </div>
      {available.length > 1 && (
        <div className="mt-1 flex items-center justify-between">
          <div className="flex">
            {available.map((p, i) => (
              <button
                key={p.id}
                className="grid min-h-11 min-w-8 place-items-center"
                aria-label={`Publicação ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => go(i)}
              >
                <span
                  className={`h-1.5 rounded-full ${i === active ? "w-5 bg-primary" : "w-1.5 bg-foreground/25"}`}
                />
              </button>
            ))}
          </div>
          <div className="flex">
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label="Publicação anterior"
              onClick={() => go(active - 1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label={paused ? "Reproduzir publicações" : "Pausar publicações"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label="Próxima publicação"
              onClick={() => go(active + 1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
export function MenuPublicacoes({ slug, items }: { slug: string; items: Item[] }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["menu-posts", slug],
    queryFn: () => getMenuPosts({ data: { slug } }),
  });
  const [posts, setPosts] = useState<MenuPost[] | null>(null),
    [busy, setBusy] = useState(false),
    [suggesting, setSuggesting] = useState(false),
    [brief, setBrief] = useState("");
  const list = posts ?? q.data ?? [];
  const photos = items.filter((i) => i.imageUrl);
  function patch(index: number, p: Partial<MenuPost>) {
    setPosts(list.map((v, i) => (i === index ? { ...v, ...p } : v)));
  }
  return (
    <section className="space-y-4 border-t border-border py-6">
      <div>
        <h3 className="font-display text-xl font-semibold">Publicações no cardápio</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Banners com foto real do prato: promoções por dia da semana, pratos novos e eventos. Monte
          até oito artes para o carrossel do cliente.
        </p>
      </div>
      <label className="block text-sm">
        O que você quer divulgar?
        <textarea
          className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
          maxLength={300}
          value={brief}
          disabled={busy || suggesting}
          placeholder="Ex.: toda terça, quem pedir camarão para dois ganha a sobremesa"
          onChange={(e) => setBrief(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          A Lebre escreve o título e o texto, escolhe o prato e os dias. Deixe em branco para ela
          sugerir destaques do cardápio.
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <LebreSuggestionButton
          loading={suggesting}
          disabled={
            q.isPending ||
            q.isError ||
            busy ||
            !photos.length ||
            list.length > (brief.trim() ? 7 : 5)
          }
          onClick={async () => {
            setSuggesting(true);
            try {
              const text = brief.trim();
              const ideas = await suggestMenuPosts({
                data: { slug, ...(text ? { brief: text } : {}) },
              });
              setPosts([...list, ...ideas].slice(0, 8));
              if (text) setBrief("");
              toast.success("Banner pronto. Revise e marque para exibir.");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setSuggesting(false);
            }
          }}
        >
          Criar banner com a Lebre
        </LebreSuggestionButton>
        <Button
          variant="outline"
          disabled={
            q.isPending || q.isError || busy || suggesting || !photos.length || list.length >= 8
          }
          onClick={() =>
            setPosts([
              ...list,
              {
                id: crypto.randomUUID(),
                title: photos[0]!.name,
                caption: "",
                itemCode: photos[0]!.code,
                theme: "photo",
                enabled: false,
              },
            ])
          }
        >
          Nova publicação
        </Button>
      </div>
      {q.isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar.{" "}
          <button onClick={() => void q.refetch()} className="underline">
            Tentar novamente
          </button>
        </p>
      )}
      {!photos.length && (
        <p className="text-sm text-muted-foreground">Adicione uma foto a um prato para começar.</p>
      )}
      <div className="space-y-5">
        {list.map((p, i) => (
          <article key={p.id} className="grid gap-4 border-b border-border pb-5 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-xs">
                Título
                <Input
                  value={p.title}
                  maxLength={70}
                  disabled={busy || suggesting}
                  onChange={(e) => patch(i, { title: e.target.value })}
                />
              </label>
              <label className="block text-xs">
                Texto
                <textarea
                  className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
                  maxLength={180}
                  disabled={busy || suggesting}
                  value={p.caption}
                  onChange={(e) => patch(i, { caption: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Prato da publicação"
                  className="h-11 max-w-full rounded-lg border border-input bg-background px-2 text-sm"
                  value={p.itemCode}
                  disabled={busy || suggesting}
                  onChange={(e) => patch(i, { itemCode: e.target.value })}
                >
                  {photos.map((item) => (
                    <option value={item.code} key={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Estilo da arte"
                  className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
                  value={p.theme}
                  disabled={busy || suggesting}
                  onChange={(e) => patch(i, { theme: e.target.value as MenuPost["theme"] })}
                >
                  <option value="photo">Foto em destaque</option>
                  <option value="paper">Fundo claro</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Selo da arte"
                  className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
                  value={p.tag ?? ""}
                  disabled={busy || suggesting}
                  onChange={(e) =>
                    patch(i, { tag: (e.target.value || undefined) as MenuPost["tag"] })
                  }
                >
                  <option value="">Sem selo</option>
                  {Object.entries(MENU_POST_TAGS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="text-xs">Dias em que aparece (nenhum marcado: todos)</legend>
                <div className="mt-1 flex flex-wrap gap-1">
                  {WEEKDAYS.map((d, n) => {
                    const on = p.days?.includes(n) ?? false;
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        disabled={busy || suggesting}
                        onClick={() =>
                          patch(i, {
                            days: on
                              ? (p.days ?? []).filter((x) => x !== n)
                              : [...(p.days ?? []), n].sort(),
                          })
                        }
                        className={`min-h-11 min-w-11 rounded-lg border px-2 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex items-center justify-between">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    disabled={busy || suggesting}
                    onChange={(e) => patch(i, { enabled: e.target.checked })}
                  />{" "}
                  Exibir no carrossel
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Retirar publicação"
                  disabled={busy || suggesting}
                  onClick={() => setPosts(list.filter((_, n) => n !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="min-w-0">
              {photos.find((item) => item.code === p.itemCode) ? (
                <PublicationArt post={p} item={photos.find((item) => item.code === p.itemCode)!} />
              ) : (
                <p className="text-sm">Escolha um prato com foto para a prévia.</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Prévia · só aparece para o cliente após salvar.
              </p>
            </div>
          </article>
        ))}
      </div>
      {posts !== null && (
        <Button
          disabled={busy || suggesting || q.isError}
          onClick={async () => {
            setBusy(true);
            try {
              await saveMenuPosts({ data: { slug, posts: list } });
              qc.setQueryData(["menu-posts", slug], list);
              setPosts(null);
              toast.success("Publicações salvas");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Salvando…" : "Salvar publicações"}
        </Button>
      )}
    </section>
  );
}
