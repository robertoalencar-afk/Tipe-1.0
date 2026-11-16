import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Reduz a imagem no navegador (webp, lado maior limitado) e devolve um data URL pequeno. */
export async function reduzirImagem(
  file: File,
  maxLado: number,
  qualidade = 0.85,
): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type))
    throw new Error("Use uma imagem PNG, JPG ou WebP");
  const bmp = await createImageBitmap(file);
  try {
    const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/webp", qualidade);
  } finally {
    bmp.close();
  }
}

/** Botão de envio com pré-visualização. `onSalvar(null)` remove a imagem. */
export function UploadImagem({
  url,
  rotulo,
  maxLado = 1200,
  quadrado = false,
  onSalvar,
  className,
}: {
  url: string | null | undefined;
  rotulo: string;
  maxLado?: number;
  quadrado?: boolean;
  onSalvar: (dataUrl: string | null) => Promise<unknown>;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  async function escolher(f?: File) {
    if (!f) return;
    setOcupado(true);
    try {
      await onSalvar(await reduzirImagem(f, maxLado));
      toast.success("Imagem salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40",
          quadrado ? "size-20" : "h-20 w-32",
        )}
      >
        {url ? (
          <img src={url} alt={rotulo} className="size-full object-contain" loading="lazy" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="space-y-1.5">
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label={rotulo}
          onChange={(e) => escolher(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={ocupado}
          onClick={() => ref.current?.click()}
        >
          {ocupado ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{" "}
          {url ? "Trocar" : "Enviar"} {rotulo.toLowerCase()}
        </Button>
        {url && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={ocupado}
            className="text-destructive"
            onClick={() => {
              setOcupado(true);
              onSalvar(null).finally(() => setOcupado(false));
            }}
          >
            <Trash2 className="size-4" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}
