import { useEffect, useState } from "react";
import { analyzeDishPhoto } from "@/lib/tipe/menu-intelligence.functions";
import { reduzirImagem } from "./UploadImagem";
import { LebreSuggestionButton } from "./LebreSuggestionButton";

export function LebrePhotoReview({ slug, photo }: { slug: string; photo: File | string | null }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setResult("");
    setError(false);
    setLoading(Boolean(photo));
    if (!photo) return;
    // Debounce avoids consuming a review when the owner immediately replaces the image.
    const timer = setTimeout(() => {
      void (async () => {
        let file: File;
        if (typeof photo === "string") {
          const response = await fetch(photo);
          if (!response.ok) throw new Error("Imagem indisponível");
          const blob = await response.blob();
          file = new File([blob], "prato", { type: blob.type });
        } else file = photo;
        const image = await reduzirImagem(file, 768);
        if (!active) return;
        const text = await analyzeDishPhoto({ data: { slug, image } });
        if (active) setResult(text);
      })()
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [slug, photo, attempt]);
  if (!photo) return null;
  return (
    <aside className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <LebreSuggestionButton
        loading={loading}
        loadingText="A Lebre está olhando a foto…"
        onClick={() => setAttempt((n) => n + 1)}
      >
        {result ? "Analisar foto novamente" : "Analisar foto com a Lebre"}
      </LebreSuggestionButton>
      <div role="status" className="whitespace-pre-wrap text-sm leading-relaxed">
        {result ||
          (error
            ? "Não consegui analisar agora. Você pode continuar editando e tentar novamente."
            : "Vou conferir a luz, o enquadramento e o fundo. Você decide se quer ajustar a foto.")}
      </div>
    </aside>
  );
}
