/**
 * "Monte o cardápio com uma foto": a tela do dono para cadastrar um prato. Ele tira UMA foto,
 * preenche nome, preço e categoria, e o prato aparece no celular do cliente como story, com
 * volume (efeito de foto 3D).
 *
 * Aqui é a demonstração do site, e tudo roda no navegador de quem testa:
 * - a foto não é enviada a lugar nenhum;
 * - o volume é calculado localmente (Depth Anything V2 Small em ONNX, Apache-2.0).
 * No painel real, o mesmo cálculo roda no navegador do dono antes do envio, então não há
 * servidor de IA nem custo por prato.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, ChevronDown, ImagePlus, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuPriceCents } from "@/lib/tipe/menu-price";
import { prepareDishDepth } from "@/lib/tipe/order/prepare-photo";
import { Secao, Titulo } from "../Site";
import { LebreSuggestionButton } from "../../LebreSuggestionButton";
import { enhanceDishPhoto } from "@/lib/tipe/order/enhance-photo";
import { toast } from "sonner";
import { Foto3D } from "./Foto3D";

const CATEGORIAS = ["Petiscos", "Pratos", "Bebidas", "Sobremesas"];

const DICAS: { titulo: string; texto: string }[] = [
  {
    titulo: "Luz de janela",
    texto: "Luz natural de lado, sem flash. Evite sol direto e sombra forte em cima do prato.",
  },
  {
    titulo: "Ângulo de 45°",
    texto:
      "Celular na altura de quem está sentado, inclinado para o prato. Nem de cima, nem de frente.",
  },
  {
    titulo: "Prato inteiro e no centro",
    texto: "Deixe uma margem em volta. Nada cortado na borda da foto.",
  },
  {
    titulo: "Fundo limpo",
    texto: "Mesa lisa ou toalha neutra. Tire copos, celulares e mãos do quadro.",
  },
  {
    titulo: "Foco e lente limpa",
    texto: "Limpe a lente, toque no prato para focar e use a câmera principal (1x), sem zoom.",
  },
  {
    titulo: "Na vertical",
    texto: "Segure o celular em pé: a foto vira o story do cliente sem cortes.",
  },
];

type Etapa = "vazio" | "processando" | "pronto" | "sem-volume";

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type GalleryPhoto = { url: string; depth: Blob; libraryName?: string };

export type PratoEditorValue = {
  libraryName?: string;
  name: string;
  price: number;
  categoryId: string;
  photo: File | null;
  depth: Blob | null;
  photoChanged: boolean;
};
type EditorProps = {
  initial?: {
    name: string;
    price: number;
    categoryId: string;
    photo: string | null;
    depth: string | null;
  };
  categories?: Array<{ id: string; name: string }>;
  restaurantName?: string;
  title?: string;
  fields?: ReactNode;
  busy?: boolean;
  hideHeading?: boolean;
  onNameChange?: (name: string) => void;
  onNameCommit?: (name: string) => void;
  descriptionField?: ReactNode;
  description?: string;
  onPhotoChange?: (photo: File | string | null) => void;
  gallery?: (onPick: (photo: GalleryPhoto) => Promise<void>, onClose: () => void) => ReactNode;
  onSave?: (value: PratoEditorValue) => Promise<void>;
};

export function CriarPratoDemo() {
  return <CriarPratoEditor />;
}

export function CriarPratoEditor({
  initial,
  categories = CATEGORIAS.map((name) => ({ id: name, name })),
  restaurantName = "Seu restaurante",
  title = "Novo prato",
  fields,
  busy = false,
  hideHeading = false,
  onSave,
  onNameChange,
  onNameCommit,
  descriptionField,
  description,
  onPhotoChange,
  gallery,
}: EditorProps) {
  const [enhancing, setEnhancing] = useState(false);
  const [enhanced, setEnhanced] = useState<{ file: File; url: string } | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [libraryName, setLibraryName] = useState<string | undefined>();
  const [foto, setFoto] = useState<string | null>(initial?.photo ?? null);
  const [prof, setProf] = useState<string | null>(initial?.depth ?? null);
  const [etapa, setEtapa] = useState<Etapa>(
    initial?.depth ? "pronto" : initial?.photo ? "sem-volume" : "vazio",
  );
  const [status, setStatus] = useState("");
  const [nome, setNome] = useState(initial?.name ?? "Moqueca de arraia");
  const [preco, setPreco] = useState(
    initial ? initial.price.toFixed(2).replace(".", ",") : "79,00",
  );
  const [cat, setCat] = useState(initial?.categoryId ?? "Pratos");
  const [dicas, setDicas] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [depthBlob, setDepthBlob] = useState<Blob | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const generation = useRef(0);
  const entrada = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      generation.current++;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  useEffect(() => {
    if (!initial?.photo || initial.depth) return;
    const current = ++generation.current;
    let cancelled = false;
    setEtapa("processando");
    prepareDishDepth(initial.photo, (text) => {
      if (!cancelled && current === generation.current) setStatus(text);
    })
      .then((map) => {
        if (cancelled || current !== generation.current) return;
        const url = URL.createObjectURL(map);
        urls.current.push(url);
        setDepthBlob(map);
        setProf(url);
        setEtapa("pronto");
      })
      .catch(() => {
        if (!cancelled && current === generation.current) setEtapa("sem-volume");
      });
    return () => {
      cancelled = true;
    };
  }, [initial?.photo, initial?.depth]);

  const parsedPrice = menuPriceCents(preco);
  const precoCentavos = parsedPrice ?? 0;

  async function escolher(arquivo: File | undefined) {
    if (!arquivo || !arquivo.type.startsWith("image/")) return;
    const current = ++generation.current;
    setEnhanced(null);
    setLibraryName(undefined);
    setPhotoFile(arquivo);
    onPhotoChange?.(arquivo);
    setDepthBlob(null);
    setPhotoChanged(true);
    const url = URL.createObjectURL(arquivo);
    urls.current.push(url);
    setFoto(url);
    setProf(null);
    setEtapa("processando");
    setStatus("Abrindo a foto…");
    try {
      const mapa = await prepareDishDepth(arquivo, (text) => {
        if (current === generation.current) setStatus(text);
      });
      if (current !== generation.current) return;
      setDepthBlob(mapa);
      const u = URL.createObjectURL(mapa);
      urls.current.push(u);
      setProf(u);
      setEtapa("pronto");
    } catch {
      if (current === generation.current) setEtapa("sem-volume");
    }
  }

  async function selectGallery(image: GalleryPhoto) {
    setEnhanced(null);
    let file: File | null = null;
    if (!image.libraryName) {
      const response = await fetch(image.url);
      if (!response.ok) throw new Error("Não foi possível carregar esta foto.");
      const blob = await response.blob();
      file = new File([blob], "foto-do-cardapio", { type: blob.type });
    }
    generation.current++;
    setPhotoFile(file);
    onPhotoChange?.(file ?? image.url);
    setLibraryName(image.libraryName);
    setPhotoChanged(true);
    setFoto(image.url);
    setDepthBlob(image.depth);
    const url = URL.createObjectURL(image.depth);
    urls.current.push(url);
    setProf(url);
    setEtapa("pronto");
    setStatus("");
    setGalleryOpen(false);
  }

  function recomecar() {
    setEnhanced(null);
    onPhotoChange?.(null);
    setLibraryName(undefined);
    generation.current++;
    setPhotoFile(null);
    setDepthBlob(null);
    setPhotoChanged(true);
    setFoto(null);
    setProf(null);
    setEtapa("vazio");
    if (entrada.current) entrada.current.value = "";
  }

  const content = (
    <div
      className={cn(
        "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start",
        !hideHeading && "mt-10",
      )}
    >
      <div className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <p className="text-sm font-semibold">{title}</p>

        <div className="mt-4">
          {foto ? (
            <div className="flex items-center gap-3">
              <img src={foto} alt="" className="h-20 w-16 rounded-xl object-cover" />
              <div className="min-w-0 text-sm">
                <p role="status" className="flex items-center gap-1.5 font-medium">
                  {etapa === "processando" && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  )}
                  {etapa === "pronto" && <Check className="h-4 w-4 text-[#03665f]" aria-hidden />}
                  {etapa === "processando"
                    ? status
                    : etapa === "pronto"
                      ? "Volume pronto. Veja no celular ao lado."
                      : photoChanged
                        ? "Não foi possível preparar o volume. Tente novamente antes de salvar."
                        : "Foto pronta. Veja no celular ao lado."}
                </p>
                <LebreSuggestionButton
                  loading={enhancing}
                  disabled={busy || etapa === "processando"}
                  onClick={async () => {
                    if (!foto) return;
                    setEnhancing(true);
                    try {
                      const response = await fetch(foto);
                      if (!response.ok) throw new Error("Não foi possível abrir a foto.");
                      const file = await enhanceDishPhoto(await response.blob());
                      const url = URL.createObjectURL(file);
                      urls.current.push(url);
                      setEnhanced({ file, url });
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setEnhancing(false);
                    }
                  }}
                >
                  Melhorar luz da foto
                </LebreSuggestionButton>
                {enhanced && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <figure>
                        <img
                          src={foto}
                          alt="Foto original"
                          className="h-28 w-full rounded-lg object-contain"
                        />
                        <figcaption className="text-xs">Original</figcaption>
                      </figure>
                      <figure>
                        <img
                          src={enhanced.url}
                          alt="Foto com luz ajustada"
                          className="h-28 w-full rounded-lg object-contain"
                        />
                        <figcaption className="text-xs">Luz ajustada</figcaption>
                      </figure>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ajuste local de luz e contraste. Confira antes de usar; não recupera detalhes
                      ausentes na foto.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-full border px-3 text-xs"
                        onClick={() => {
                          const file = enhanced.file;
                          setEnhanced(null);
                          void escolher(file);
                        }}
                      >
                        Usar e preparar volume
                      </button>
                      <button
                        type="button"
                        className="min-h-11 px-3 text-xs"
                        onClick={() => setEnhanced(null)}
                      >
                        Manter original
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy || enhancing}
                  onClick={recomecar}
                  className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Trocar foto
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => (gallery ? setGalleryOpen(true) : entrada.current?.click())}
              className="flex w-full min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background-muted px-4 text-center hover:border-[#0FC9BD]"
            >
              <span className="flex gap-2 text-[#03665f]">
                <Camera className="h-6 w-6" aria-hidden />
                <ImagePlus className="h-6 w-6" aria-hidden />
              </span>
              <span className="text-sm font-semibold">Escolha uma foto para o prato</span>
              <span className="text-xs text-muted-foreground">
                Uma foto só, na vertical. Sem scanner.
              </span>
            </button>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => camera.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Camera className="h-4 w-4" aria-hidden />
              Tirar foto
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => (gallery ? setGalleryOpen(true) : entrada.current?.click())}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              Escolher da galeria
            </button>
          </div>
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Tirar foto do prato"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              void escolher(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={entrada}
            id="foto-prato"
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              void escolher(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {galleryOpen && gallery?.(selectGallery, () => setGalleryOpen(false))}

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_9rem]">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Nome do prato</span>
            <input
              maxLength={80}
              disabled={busy}
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                onNameChange?.(e.target.value);
              }}
              onBlur={() => onNameCommit?.(nome)}
              className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Preço (R$)</span>
            <input
              disabled={busy}
              value={preco}
              inputMode="decimal"
              onChange={(e) => setPreco(e.target.value.replace(/[^0-9,.]/g, ""))}
              className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 tabular-nums"
            />
          </label>
        </div>
        {descriptionField && <div className="mt-5">{descriptionField}</div>}
        <fieldset className="mt-3">
          <legend className="text-sm font-medium">Categoria</legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={cat === c.id}
                disabled={busy}
                onClick={() => setCat(c.id)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold",
                  cat === c.id ? "border-[#0FC9BD] bg-[#0FC9BD] text-[#021E34]" : "border-border",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>

        {fields && <div className="mt-5">{fields}</div>}
        <div className="mt-6 rounded-2xl bg-[#e6faf8] p-4 text-[#021E34]">
          <button
            type="button"
            onClick={() => setDicas((v) => !v)}
            aria-expanded={dicas}
            className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" aria-hidden /> Como tirar a foto perfeita
            </span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", dicas && "rotate-180")}
              aria-hidden
            />
          </button>
          {dicas && (
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {DICAS.map((d, i) => (
                <li key={d.titulo} className="flex gap-2 text-sm">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#021E34] text-[0.65rem] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold">{d.titulo}.</span> {d.texto}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        {onSave && (
          <button
            type="button"
            disabled={
              busy ||
              etapa === "processando" ||
              (!!foto && !prof) ||
              nome.trim().length < 2 ||
              parsedPrice === null ||
              !cat
            }
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-[#021E34] px-6 font-semibold text-white disabled:opacity-50"
            onClick={() =>
              onSave({
                name: nome,
                price: precoCentavos / 100,
                categoryId: cat,
                photo: photoFile,
                depth: depthBlob,
                photoChanged,
                ...(libraryName ? { libraryName } : {}),
              })
            }
          >
            {busy ? "Salvando…" : "Salvar prato"}
          </button>
        )}
      </div>

      {/* Prévia no celular do cliente */}
      <div className="mx-auto w-full max-w-[22rem] rounded-[2.6rem] bg-[#021E34] p-2.5 shadow-[0_40px_80px_-30px_rgb(2_30_52/0.55)]">
        <div className="relative h-[36rem] overflow-hidden rounded-[2.1rem] bg-[#021E34] text-white">
          {foto ? (
            prof ? (
              <Foto3D foto={foto} profundidade={prof} alt={nome} intensidade={0.05} />
            ) : (
              <img src={foto} alt={nome} className="absolute inset-0 h-full w-full object-cover" />
            )
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#0FC9BD_0%,#03665f_35%,#021E34_75%)] px-8 text-center">
              <p className="text-sm text-white/85">
                A foto do seu prato aparece aqui, como o cliente vai ver.
              </p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3">
            <div className="flex gap-1">
              <span className="h-[3px] flex-1 rounded-full bg-white" />
              <span className="h-[3px] flex-1 rounded-full bg-white/30" />
            </div>
            <p className="mt-2.5 text-sm font-semibold">
              {categories.find((c) => c.id === cat)?.name ?? "Categoria"}
              <span className="block text-[0.68rem] font-normal text-white/75">
                {restaurantName}
              </span>
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-5">
            {etapa === "pronto" && (
              <span className="rounded-full bg-[#0FC9BD] px-2 py-0.5 text-[0.68rem] font-semibold text-[#021E34]">
                Com volume
              </span>
            )}
            <p className="mt-2 font-display text-[1.6rem] leading-[1.05] tracking-[-0.03em]">
              {nome || "Nome do prato"}
            </p>
            {description?.trim() && (
              <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
                {description}
              </p>
            )}
            <div className="mt-3 flex h-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#021E34]">
              Adicionar · {brl(precoCentavos)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return hideHeading ? (
    <div>{content}</div>
  ) : (
    <Secao id="monte-com-uma-foto" ariaLabel="Monte o cardápio com uma foto">
      <Titulo
        rotulo="Para o dono"
        titulo="Uma foto. O prato ganha volume."
        texto="Fotografe o prato no celular, preencha nome e preço, e ele já aparece em story para o cliente. Teste com uma foto sua: ela não sai do seu aparelho."
      />
      {content}
    </Secao>
  );
}
