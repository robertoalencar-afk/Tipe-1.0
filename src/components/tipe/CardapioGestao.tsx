import { MenuPublicacoes } from "./MenuPublicacoes";
import { LebrePhotoReview } from "./LebrePhotoReview";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPdvData, saveCategory, saveMenuItem } from "@/lib/tipe/pdv.functions";
import { suggestDishDescription } from "@/lib/tipe/menu-intelligence.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveFotoItem, usarImagemDoBanco } from "@/lib/tipe/midia.functions";
import { CriarPratoEditor, type PratoEditorValue } from "./site/order/CriarPratoDemo";
import { prepareDishDepth, photoBlobDataUrl } from "@/lib/tipe/order/prepare-photo";
import { reduzirImagem } from "./UploadImagem";
import { MenuInteligente } from "./MenuInteligente";
import { BancoImagens } from "./BancoImagens";
import { ImportarCardapio } from "./ImportarCardapio";
import { RevisaoLebre } from "./RevisaoLebre";

import { LebreSuggestionButton } from "./LebreSuggestionButton";
import { AcompanhamentosEditor } from "./AcompanhamentosEditor";
import { readMenuConfig, type Accompaniments } from "@/lib/tipe/menu-intelligence";

type Pdv = Awaited<ReturnType<typeof getPdvData>>;
type Media = Record<string, { foto: string | null; profundidade: string | null }>;
type Draft = {
  id?: string;
  categoryId: string | null;
  code: string;
  name: string;
  price: number;
  available: boolean;
  sector: "kitchen" | "bar";
  description: string;
  accompaniments: Accompaniments;
};
const blobDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível preparar a imagem."));
    reader.readAsDataURL(blob);
  });

export function CardapioGestao({
  slug,
  pdv,
  midia,
  onDone,
  restaurantName,
  editarId,
  onEditarAberto,
}: {
  editarId?: string | null | undefined;
  onEditarAberto?: (() => void) | undefined;
  restaurantName: string;
  slug: string;
  pdv: Pdv;
  midia: Media;
  onDone: () => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const requestDescription = useRef(0);
  const attemptedNames = useRef(new Set<string>());
  async function suggestDescription(name: string, automatic = false) {
    if (
      name.trim().length < 3 ||
      (automatic && (draft.description.trim() || attemptedNames.current.has(name)))
    )
      return;
    attemptedNames.current.add(name);
    const request = ++requestDescription.current;
    const original = draft.description;
    const originalId = draft.id;
    setSuggesting(true);
    try {
      const description = await suggestDishDescription({
        data: { slug, name, description: original },
      });
      if (request === requestDescription.current)
        setDraft((current) =>
          current.id === originalId && current.name === name && current.description === original
            ? { ...current, description }
            : current,
        );
    } catch {
      if (request === requestDescription.current)
        toast.error(
          "Não consegui sugerir agora. Você pode escrever a descrição ou tentar novamente.",
        );
    } finally {
      if (request === requestDescription.current) setSuggesting(false);
    }
  }
  const qc = useQueryClient();
  const saveItem = useServerFn(saveMenuItem);
  const savePhoto = useServerFn(saveFotoItem);
  const saveCat = useServerFn(saveCategory);
  const savedCodes = useRef(new Set<string>());
  const nextCode = () => {
    const used = new Set([...pdv.items.map((i) => i.code.toUpperCase()), ...savedCodes.current]);
    let n = 1;
    while (used.has(`P${String(n).padStart(3, "0")}`)) n++;
    return `P${String(n).padStart(3, "0")}`;
  };
  const empty = (): Draft => ({
    categoryId: pdv.categories[0]?.id ?? null,
    code: nextCode(),
    name: "",
    price: 0,
    available: true,
    sector: "kitchen",
    description: "",
    accompaniments: { enabled: false, min: 0, max: 1, choices: [] },
  });
  const [draft, setDraft] = useState<Draft>(empty);
  const [reviewPhoto, setReviewPhoto] = useState<File | string | null>(null);
  const [generation, setGeneration] = useState(0);
  const editor = useRef<HTMLDivElement>(null);
  const scrollToEditor = useRef(false);
  useEffect(() => {
    setReviewPhoto(null);
  }, [generation]);
  useEffect(() => {
    if (!scrollToEditor.current) return;
    scrollToEditor.current = false;
    editor.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [generation]);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [category, setCategory] = useState("");
  const attemptedPhotos = useRef(new Set<string>());
  const [photoProgress, setPhotoProgress] = useState("");
  useEffect(() => {
    let active = true;
    const photos = Object.entries(midia).filter(
      ([, media]) => media.foto && !media.profundidade && !attemptedPhotos.current.has(media.foto),
    );
    if (!photos.length) return;
    void (async () => {
      let prepared = 0;
      for (const [id, media] of photos) {
        if (!active || !media.foto) break;
        attemptedPhotos.current.add(media.foto);
        try {
          const depth = await prepareDishDepth(media.foto, (text) => {
            if (active) setPhotoProgress(`${prepared + 1}/${photos.length} · ${text}`);
          });
          if (!active) {
            attemptedPhotos.current.delete(media.foto);
            break;
          }
          await savePhoto({
            data: {
              slug,
              itemId: id,
              tipo: "profundidade",
              sourcePhoto: media.foto,
              imagem: await photoBlobDataUrl(depth),
            },
          });
          prepared++;
        } catch {
          if (active)
            setPhotoProgress(
              "Não foi possível preparar uma das fotos. Abra o prato para tentar novamente.",
            );
        }
      }
      if (active) {
        await qc.invalidateQueries({ queryKey: ["midia", slug] });
        setPhotoProgress(
          prepared === photos.length
            ? "Todas as fotos do cardápio estão preparadas pelo motor."
            : "Algumas fotos precisam de nova tentativa no editor do prato.",
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [midia, slug, savePhoto, qc]);
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["midia", slug] }),
      qc.invalidateQueries({ queryKey: ["banco-imagens", slug] }),
      qc.invalidateQueries({ queryKey: ["menu-studio", slug] }),
    ]);
    onDone();
  };
  const reset = () => {
    requestDescription.current++;
    setSuggesting(false);
    setDraft(empty());
    setGeneration((n) => n + 1);
  };
  async function save(value: PratoEditorValue) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const code = draft.code.trim();
      if (!code) throw new Error("Informe o código do prato para salvar.");
      const result = await saveItem({
        data: {
          slug,
          ...draft,
          ...{ name: value.name, price: value.price, categoryId: value.categoryId || null },
        },
      });
      savedCodes.current.add(code.toUpperCase());
      // Um erro de envio de mídia não pode duplicar o produto quando o dono tenta de novo.
      setDraft((d) => ({ ...d, id: result.itemId }));
      if (value.libraryName && value.photoChanged && value.depth) {
        await usarImagemDoBanco({
          data: {
            slug,
            itemId: result.itemId,
            nome: value.libraryName,
            profundidade: await blobDataUrl(value.depth),
          },
        });
      } else if (value.photoChanged) {
        const image = value.photo ? await reduzirImagem(value.photo, 1200) : null;
        await savePhoto({
          data: {
            slug,
            itemId: result.itemId,
            tipo: "foto",
            imagem: image,
            ...(value.depth && value.photo ? { profundidade: await blobDataUrl(value.depth) } : {}),
          },
        });
      } else if (value.depth && draft.id && midia[draft.id]?.foto) {
        await savePhoto({
          data: {
            slug,
            itemId: result.itemId,
            tipo: "profundidade",
            sourcePhoto: midia[draft.id]!.foto!,
            imagem: await blobDataUrl(value.depth),
          },
        });
      }
      await refresh();
      toast.success("Prato salvo no cardápio");
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o prato.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const groups = [
    ...pdv.categories,
    ...(pdv.items.some((i) => !i.category_id) ? [{ id: null, name: "Sem categoria" }] : []),
  ];
  // Vindo do Studio de fotos: abre direto o editor do prato escolhido.
  useEffect(() => {
    if (!editarId || !pdv.items.some((i) => i.id === editarId)) return;
    editItem(editarId);
    onEditarAberto?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarId, pdv.items]);
  function editItem(id: string) {
    requestDescription.current++;
    setSuggesting(false);
    const item = pdv.items.find((i) => i.id === id);
    if (!item) return;
    setDraft({
      id: item.id,
      categoryId: item.category_id,
      code: item.code,
      name: item.name,
      price: item.price,
      available: item.available,
      sector: item.sector === "bar" ? "bar" : "kitchen",
      description: item.description ?? "",
      accompaniments: readMenuConfig(item.menu_config).accompaniments ?? {
        enabled: false,
        min: 0,
        max: 1,
        choices: [],
      },
    });
    setGeneration((n) => n + 1);
    scrollToEditor.current = true;
  }
  return (
    <div className="min-w-0 space-y-8">
      {photoProgress && (
        <p role="status" className="text-sm text-muted-foreground">
          {photoProgress}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            Uma foto, nome e preço. Confira ao lado como o cliente vai ver.
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={reset}>
          Novo prato
        </Button>
      </div>
      <div ref={editor} className="scroll-mt-24">
        <CriarPratoEditor
          key={generation}
          hideHeading
          description={draft.description}
          onPhotoChange={setReviewPhoto}
          gallery={(onPick, onClose) => (
            <Dialog
              open
              onOpenChange={(open) => {
                if (!open) onClose();
              }}
            >
              <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Galeria do restaurante</DialogTitle>
                  <DialogDescription>
                    Escolha uma foto salva ou envie uma nova. Ela entra no prato que você está
                    editando.
                  </DialogDescription>
                </DialogHeader>
                <BancoImagens
                  slug={slug}
                  podeDono
                  itens={[]}
                  onAplicada={() => {}}
                  onEscolher={onPick}
                  fotosAtuais={pdv.items.flatMap((i) =>
                    midia[i.id]?.foto ? [{ id: i.id, name: i.name, url: midia[i.id]!.foto! }] : [],
                  )}
                />
              </DialogContent>
            </Dialog>
          )}
          onNameChange={(name) => setDraft((d) => ({ ...d, name }))}
          onNameCommit={(name) => void suggestDescription(name, true)}
          descriptionField={
            <div className="space-y-2">
              <LebrePhotoReview key={generation} slug={slug} photo={reviewPhoto} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="dish-description" className="text-sm font-medium">
                  Descrição do prato
                </label>
                <LebreSuggestionButton
                  loading={suggesting}
                  loadingText="A Lebre está escrevendo…"
                  disabled={busy || draft.name.trim().length < 3}
                  onClick={() => void suggestDescription(draft.name)}
                >
                  Sugerir texto com a Lebre
                </LebreSuggestionButton>
              </div>
              <textarea
                id="dish-description"
                maxLength={200}
                rows={3}
                disabled={busy}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Conte ao cliente o que vem no prato e como ele é preparado."
                className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Revise a sugestão da Lebre e confirme os ingredientes antes de salvar.{" "}
                {draft.description.length}/200
              </p>
            </div>
          }
          title={draft.id ? "Editar prato" : "Novo prato"}
          busy={busy}
          initial={{
            name: draft.name,
            price: draft.price,
            categoryId: draft.categoryId ?? pdv.categories[0]?.id ?? "",
            photo: draft.id ? (midia[draft.id]?.foto ?? null) : null,
            depth: draft.id ? (midia[draft.id]?.profundidade ?? null) : null,
          }}
          categories={pdv.categories}
          restaurantName={restaurantName}
          onSave={save}
          fields={
            <>
              <AcompanhamentosEditor
                key={generation}
                value={draft.accompaniments}
                onChange={(accompaniments) => setDraft((d) => ({ ...d, accompaniments }))}
                items={pdv.items}
                slug={slug}
                code={draft.code}
                name={draft.name}
                description={draft.description}
                disabled={busy}
              />
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  Opções do prato · código e preparo
                </summary>
                <fieldset disabled={busy} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Código do prato
                    <Input
                      maxLength={16}
                      placeholder="Ex.: P10"
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Enviar pedido para
                    <select
                      className="h-11 rounded-xl border border-input bg-background px-3"
                      value={draft.sector}
                      onChange={(e) =>
                        setDraft({ ...draft, sector: e.target.value as Draft["sector"] })
                      }
                    >
                      <option value="kitchen">Cozinha</option>
                      <option value="bar">Bar</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.available}
                      onChange={(e) => setDraft({ ...draft, available: e.target.checked })}
                    />
                    Disponível para pedidos
                  </label>
                </fieldset>
              </details>
            </>
          }
        />
      </div>
      <section aria-label="Pratos cadastrados" className="space-y-5">
        <h3 className="font-display text-xl font-medium">Pratos do cardápio</h3>
        {pdv.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Cadastre o primeiro prato no editor acima.
          </p>
        )}
        {groups.map((cat) => (
          <div key={cat.id}>
            <h4 className="mb-2 text-sm font-semibold">{cat.name}</h4>
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {pdv.items
                .filter((i) => i.category_id === cat.id)
                .map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        editItem(item.id);
                      }}
                      className="flex min-h-20 w-full items-center gap-3 p-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-xs">
                        {midia[item.id]?.foto ? (
                          <img
                            alt=""
                            src={midia[item.id]!.foto!}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "Foto"
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.code} · {item.available ? "Disponível" : "Esgotado"}
                        </span>
                      </span>
                      <span className="text-sm font-semibold">
                        {item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="text-sm underline">Editar</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await saveCat({ data: { slug, name: category } });
            setCategory("");
            onDone();
            toast.success("Categoria criada");
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          required
          aria-label="Nova categoria"
          placeholder="Nova categoria"
          className="min-w-40 flex-1"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Button disabled={busy} variant="outline">
          Criar categoria
        </Button>
      </form>
      <RevisaoLebre
        slug={slug}
        items={pdv.items}
        categories={pdv.categories}
        midia={midia}
        onDone={onDone}
        onEditItem={editItem}
      />
      <MenuInteligente slug={slug} onEditItem={editItem} />
      <ImportarCardapio slug={slug} onDone={refresh} />
      <MenuPublicacoes
        slug={slug}
        items={pdv.items.map((i) => ({
          code: i.code,
          name: i.name,
          imageUrl: midia[i.id]?.foto ?? null,
        }))}
      />
    </div>
  );
}
