/**
 * Revisão da Lebre no Cardápio: nota do cardápio e pendências item por item
 * (foto, resolução, descrição, nome, preço, categoria, preparo, repetidos,
 * tradução). Correções simples aplicam com um toque; a Lebre também confere se
 * cada foto mostra o prato e sugere descrições, sempre para o dono aprovar.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { saveMenuItem } from "@/lib/tipe/pdv.functions";
import { checkDishPhoto, suggestDishDescription } from "@/lib/tipe/menu-intelligence.functions";
import { menuScore, reviewMenu, type Issue, type ReviewItem } from "@/lib/tipe/menu-review";
import { LebreSuggestionButton } from "./LebreSuggestionButton";

type Item = {
  id: string;
  category_id: string | null;
  code: string;
  name: string;
  price: number;
  available: boolean;
  sector: string;
  description: string | null;
  menu_config: {
    translations?: { en?: { name?: string } | undefined; es?: { name?: string } | undefined };
  };
};
type Props = {
  slug: string;
  items: Item[];
  categories: { id: string; name: string }[];
  midia: Record<string, { foto: string | null; profundidade: string | null }>;
  onDone: () => void;
  onEditItem: (id: string) => void;
};
type PhotoCheck = { match: "sim" | "nao" | "incerto"; reason: string };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function smallDataUrl(img: HTMLImageElement) {
  const scale = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

export function RevisaoLebre({ slug, items, categories, midia, onDone, onEditItem }: Props) {
  const save = useServerFn(saveMenuItem);
  const describe = useServerFn(suggestDishDescription);
  const check = useServerFn(checkDishPhoto);
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [checks, setChecks] = useState<Record<string, PhotoCheck>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(false);

  // Mede a resolução real de cada foto no navegador (rápido e sem custo).
  useEffect(() => {
    let alive = true;
    for (const i of items) {
      const src = midia[i.id]?.foto;
      if (!src || sizes[i.id]) continue;
      loadImage(src)
        .then((img) => {
          if (alive)
            setSizes((s) => ({ ...s, [i.id]: { w: img.naturalWidth, h: img.naturalHeight } }));
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, midia]);

  const review: ReviewItem[] = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        categoryId: i.category_id,
        sector: i.sector,
        description: i.description,
        available: i.available,
        photo: midia[i.id]?.foto ?? null,
        depth: midia[i.id]?.profundidade ?? null,
        photoSize: sizes[i.id],
        translated: !!(
          i.menu_config.translations?.en?.name && i.menu_config.translations?.es?.name
        ),
      })),
    [items, midia, sizes],
  );
  const issues = useMemo(() => {
    const base = reviewMenu(review, categories);
    for (const [itemId, c] of Object.entries(checks))
      if (c.match !== "sim")
        base.push({
          itemId,
          kind: "foto-nao-condiz",
          level: c.match === "nao" ? "corrigir" : "melhorar",
          text: `A foto ${c.match === "nao" ? "não parece mostrar" : "talvez não mostre"} este prato: ${c.reason}`,
        });
    return base;
  }, [review, categories, checks]);
  const score = menuScore(review, issues);
  const byItem = useMemo(() => {
    const m = new Map<string, Issue[]>();
    for (const i of issues) m.set(i.itemId, [...(m.get(i.itemId) ?? []), i]);
    return [...m.entries()].sort(
      ([, a], [, b]) =>
        b.filter((x) => x.level === "corrigir").length -
        a.filter((x) => x.level === "corrigir").length,
    );
  }, [issues]);
  const must = issues.filter((i) => i.level === "corrigir").length;

  async function persist(
    item: Item,
    patch: Partial<{
      name: string;
      categoryId: string | null;
      sector: "bar" | "kitchen";
      description: string;
    }>,
  ) {
    await save({
      data: {
        slug,
        id: item.id,
        categoryId: patch.categoryId !== undefined ? patch.categoryId : item.category_id,
        code: item.code,
        name: patch.name ?? item.name,
        price: item.price,
        available: item.available,
        ...(patch.sector ? { sector: patch.sector } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
      },
    });
  }
  async function apply(item: Item, issue: Issue) {
    if (!issue.fix) return;
    setBusy(`${item.id}:${issue.kind}`);
    try {
      const fix = issue.fix;
      if ("name" in fix) await persist(item, { name: fix.name });
      else if ("sector" in fix) await persist(item, { sector: fix.sector });
      else {
        const target = categories.find((c) => c.name === fix.categoryName);
        if (target) await persist(item, { categoryId: target.id });
      }
      toast.success(`${item.name}: corrigido`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function suggest(item: Item) {
    setBusy(`${item.id}:desc`);
    try {
      const text = await describe({
        data: { slug, name: item.name, description: item.description ?? "" },
      });
      setDrafts((d) => ({ ...d, [item.id]: text }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function checkPhotos() {
    const targets = items.filter((i) => midia[i.id]?.foto && !checks[i.id]).slice(0, 40);
    for (const [n, item] of targets.entries()) {
      setBusy(`fotos:${n + 1}/${targets.length}`);
      try {
        const img = await loadImage(midia[item.id]!.foto!);
        const result = await check({
          data: {
            slug,
            name: item.name,
            description: item.description ?? "",
            image: smallDataUrl(img),
          },
        });
        setChecks((c) => ({ ...c, [item.id]: result }));
      } catch (e) {
        toast.error((e as Error).message);
        break;
      }
    }
    setBusy("");
  }

  if (!items.length) return null;
  const itemById = new Map(items.map((i) => [i.id, i]));
  return (
    <section
      aria-labelledby="revisao-lebre"
      className="space-y-4 rounded-3xl border border-border p-5"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#071d2b] text-xl font-semibold text-teal-300"
          aria-label={`Nota do cardápio ${score} de 100`}
        >
          {score}
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="revisao-lebre" className="font-display text-lg font-semibold">
            Revisão da Lebre
          </h3>
          <p className="text-sm text-muted-foreground">
            {must
              ? `${must} pendência(s) para corrigir e ${issues.length - must} melhoria(s) em ${byItem.length} de ${items.length} itens.`
              : issues.length
                ? `Nada obrigatório. ${issues.length} melhoria(s) sugerida(s).`
                : "Cardápio completo: fotos, descrições, categorias e preços em ordem."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LebreSuggestionButton
            loading={busy.startsWith("fotos")}
            loadingText={`Conferindo ${busy.replace("fotos:", "")}…`}
            disabled={!!busy}
            onClick={() => void checkPhotos()}
          >
            Conferir fotos com a Lebre
          </LebreSuggestionButton>
          {!!issues.length && (
            <Button variant="outline" onClick={() => setOpen((o) => !o)}>
              {open ? "Ocultar itens" : "Ver item por item"}
            </Button>
          )}
        </div>
      </div>
      {open && (
        <ul className="max-h-[70dvh] space-y-3 overflow-y-auto pr-1">
          {byItem.map(([id, list]) => {
            const item = itemById.get(id);
            if (!item) return null;
            const photo = midia[id]?.foto;
            return (
              <li key={id} className="rounded-2xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-[10px] text-muted-foreground">
                    {photo ? (
                      <img alt="" src={photo} className="size-full object-cover" />
                    ) : (
                      "Sem foto"
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {categories.find((c) => c.id === item.category_id)?.name ?? "Sem categoria"} ·{" "}
                      {item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => onEditItem(id)}>
                    Editar
                  </Button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {list.map((issue, k) => (
                    <li key={k} className="flex flex-wrap items-start gap-2 text-sm">
                      <AlertCircle
                        aria-hidden
                        className={`mt-0.5 size-4 shrink-0 ${issue.level === "corrigir" ? "text-destructive" : "text-amber-600"}`}
                      />
                      <span className="min-w-0 flex-1">{issue.text}</span>
                      {issue.fix && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!busy}
                          onClick={() => void apply(item, issue)}
                        >
                          <Check className="size-3.5" /> Aplicar
                        </Button>
                      )}
                      {(issue.kind === "sem-descricao" || issue.kind === "descricao-curta") &&
                        !drafts[id] && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!busy}
                            onClick={() => void suggest(item)}
                          >
                            <Sparkles className="size-3.5" /> Sugerir
                          </Button>
                        )}
                    </li>
                  ))}
                </ul>
                {drafts[id] && (
                  <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="text-xs font-medium">Sugestão da Lebre: confira antes de usar</p>
                    <p className="mt-1">{drafts[id]}</p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy(`${id}:save`);
                          try {
                            await persist(item, { description: drafts[id]! });
                            setDrafts(({ [id]: _, ...rest }) => rest);
                            toast.success("Descrição salva");
                            onDone();
                          } catch (e) {
                            toast.error((e as Error).message);
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        Usar descrição
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDrafts(({ [id]: _, ...rest }) => rest)}
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
