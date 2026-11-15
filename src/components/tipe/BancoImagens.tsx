import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addBancoImagem,
  getBancoImagens,
  removeBancoImagem,
  usarImagemDoBanco,
} from "@/lib/tipe/midia.functions";
import { prepareDishDepth, photoBlobDataUrl } from "@/lib/tipe/order/prepare-photo";
import { reduzirImagem } from "@/components/tipe/UploadImagem";

import type { GalleryPhoto } from "./site/order/CriarPratoDemo";

type Item = { id: string; name: string };

/** Banco de imagens do restaurante: envie várias fotos e aplique cada uma a um prato. */
export function BancoImagens({
  slug,
  podeDono,
  itens,
  onAplicada,
  onEscolher,
  fotosAtuais = [],
}: {
  slug: string;
  podeDono: boolean;
  itens: Item[];
  onAplicada: () => void;
  onEscolher?: (photo: GalleryPhoto) => Promise<void>;
  fotosAtuais?: { id: string; name: string; url: string }[];
}) {
  const qc = useQueryClient();
  const fetchB = useServerFn(getBancoImagens);
  const add = useServerFn(addBancoImagem);
  const del = useServerFn(removeBancoImagem);
  const usar = useServerFn(usarImagemDoBanco);
  const q = useQuery({
    queryKey: ["banco-imagens", slug],
    queryFn: () => fetchB({ data: { slug } }),
  });
  const [aba, setAba] = useState<"cardapio" | "envios" | "logo">("cardapio");
  const depths = useRef(new Map<string, Blob>());
  const [processo, setProcesso] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    setAba("envios");
    setEnviando(files.length);
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        const depth = await prepareDishDepth(f, setProcesso);
        const saved = await add({ data: { slug, imagem: await reduzirImagem(f, 1200) } });
        depths.current.set(saved.nome, depth);
        ok += 1;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
      setEnviando((n) => n - 1);
    }
    if (ok) toast.success(ok === 1 ? "Imagem enviada" : `${ok} imagens enviadas`);
    if (ref.current) ref.current.value = "";
    setProcesso("");
    await qc.invalidateQueries({ queryKey: ["banco-imagens", slug] });
  }
  async function aplicar(nome: string, itemId: string) {
    setAplicando(true);
    try {
      const image = q.data?.imagens.find((im) => im.nome === nome);
      if (!image) throw new Error("Imagem não encontrada.");
      const depth = depths.current.get(nome) ?? (await prepareDishDepth(image.url, setProcesso));
      await usar({ data: { slug, itemId, nome, profundidade: await photoBlobDataUrl(depth) } });
      toast.success("Foto aplicada ao prato");
      setEscolhida(null);
      setProcesso("");
      onAplicada();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setAplicando(false);
    setProcesso("");
  }
  async function escolher(url: string, libraryName?: string) {
    if (!onEscolher) return;
    setAplicando(true);
    try {
      const depth =
        (libraryName && depths.current.get(libraryName)) ||
        (await prepareDishDepth(url, setProcesso));
      await onEscolher({ url, depth, ...(libraryName ? { libraryName } : {}) });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setAplicando(false);
      setProcesso("");
    }
  }
  async function remover(nome: string) {
    try {
      await del({ data: { slug, nome } });
      toast.success("Imagem removida");
      await qc.invalidateQueries({ queryKey: ["banco-imagens", slug] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const imagens = q.data?.imagens ?? [];
  const catalogo = q.data?.cardapio ?? fotosAtuais;
  return (
    <section className={onEscolher ? "min-w-0 space-y-4" : "surface-card space-y-4 p-4 sm:p-5"}>
      {processo && (
        <p role="status" className="text-sm text-muted-foreground">
          {processo}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {!onEscolher && <h2 className="font-display font-semibold">Galeria do restaurante</h2>}
          <p className="text-xs text-muted-foreground">
            Guarde as fotos do restaurante em um só lugar e use em qualquer prato. PNG, JPG ou WebP;
            o motor prepara a aparência 3D e reduz o tamanho automaticamente.
          </p>
        </div>
        {podeDono && (
          <>
            <input
              ref={ref}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-label="Enviar imagens"
              onChange={(e) => void enviar(e.target.files)}
            />
            <Button
              type="button"
              onClick={() => ref.current?.click()}
              disabled={enviando > 0 || aplicando}
            >
              {enviando > 0 ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-1.5 size-4" />
              )}
              {enviando > 0 ? `Enviando… (${enviando})` : "Enviar novas fotos"}
            </Button>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Categorias de imagens">
        {(
          [
            ["cardapio", "Cardápio"],
            ["envios", "Fotos enviadas"],
            ["logo", "Logomarca"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={aba === id ? "default" : "outline"}
            aria-pressed={aba === id}
            onClick={() => setAba(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {aba === "logo" &&
        !q.isPending &&
        !q.isError &&
        (q.data?.logoUrl ? (
          <div className="rounded-xl border border-border p-6">
            <img
              src={q.data.logoUrl}
              alt="Logomarca do restaurante"
              className="h-40 w-full object-contain"
            />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Logomarca usada pelo restaurante
            </p>
          </div>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            O restaurante ainda não cadastrou uma logomarca.
          </p>
        ))}
      {aba === "cardapio" &&
        !q.isPending &&
        !q.isError &&
        (catalogo.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {catalogo.map((f) => (
              <li key={f.id} className="min-w-0 space-y-2">
                <img
                  src={f.url}
                  alt={f.name}
                  loading="lazy"
                  className="aspect-square w-full rounded-xl object-cover"
                />
                <p className="break-words text-sm font-medium">{f.name}</p>
                {onEscolher && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={aplicando || enviando > 0}
                    onClick={() =>
                      void escolher(
                        f.url,
                        imagens.find((i) => i.url.split("?")[0] === f.url.split("?")[0])?.nome,
                      )
                    }
                  >
                    Usar esta foto
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            As fotos dos pratos cadastrados aparecerão aqui. Você também pode escolher uma das fotos
            enviadas.
          </p>
        ))}
      {q.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : q.isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>Não foi possível carregar as imagens.</p>
          <Button variant="outline" onClick={() => void q.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : aba !== "envios" ? null : imagens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma foto salva na galeria ainda.{" "}
          {podeDono
            ? "Envie fotos autorizadas para exibição pública no cardápio."
            : "O administrador pode enviar as fotos."}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {imagens.map((im) => (
            <li key={im.nome} className="min-w-0 space-y-1.5">
              <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                <img src={im.url} alt="" loading="lazy" className="size-full object-cover" />
                {podeDono && (
                  <button
                    type="button"
                    onClick={() => void remover(im.nome)}
                    className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/60 text-white opacity-100 transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    aria-label="Remover imagem"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {onEscolher ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={aplicando || enviando > 0}
                  onClick={() => void escolher(im.url, im.nome)}
                >
                  {aplicando ? "Preparando…" : "Usar esta foto"}
                </Button>
              ) : (
                podeDono &&
                (escolhida === im.nome ? (
                  <select
                    autoFocus
                    disabled={aplicando}
                    defaultValue=""
                    onChange={(e) => e.target.value && void aplicar(im.nome, e.target.value)}
                    onBlur={() => setEscolhida(null)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                    aria-label="Escolher prato"
                  >
                    <option value="" disabled>
                      Escolha o prato
                    </option>
                    {itens.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setEscolhida(im.nome)}
                  >
                    Usar em um prato
                  </Button>
                ))
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
