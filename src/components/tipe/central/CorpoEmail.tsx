import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { prepararEmailHtml } from "@/lib/tipe/email-html";

/**
 * Corpo de um e-mail na Central. HTML de terceiros vai num iframe sandbox (sem scripts) depois de limpo;
 * a altura acompanha o conteúdo e, se o e-mail for mais largo que a tela (ex.: tabela de 600px no celular),
 * ele é reduzido para caber, sem rolagem lateral. Sem HTML, mostra o texto puro.
 */
export function CorpoEmail({
  html,
  texto,
  bloquearImagens = false,
}: {
  html: string | null | undefined;
  texto: string | null | undefined;
  bloquearImagens?: boolean;
}) {
  const [imagens, setImagens] = useState(!bloquearImagens);
  const [verTexto, setVerTexto] = useState(false);
  // DOMParser só existe no navegador: prepara depois de montar para o SSR bater com a hidratação.
  const [cliente, setCliente] = useState(false);
  useEffect(() => setCliente(true), []);
  const pronto = useMemo(
    () => (html && cliente ? prepararEmailHtml(html, { imagensRemotas: imagens }) : null),
    [html, imagens, cliente],
  );
  const ref = useRef<HTMLIFrameElement>(null);
  const [altura, setAltura] = useState(120);

  useEffect(() => {
    const f = ref.current;
    if (!f || !pronto || verTexto) return;
    let ro: ResizeObserver | null = null;
    const ajustar = () => {
      const d = f.contentDocument;
      if (!d?.body) return;
      d.body.style.zoom = "";
      const largura = f.clientWidth;
      const conteudo = Math.max(d.documentElement.scrollWidth, d.body.scrollWidth);
      if (largura > 0 && conteudo > largura + 2) d.body.style.zoom = String(largura / conteudo);
      setAltura(Math.ceil(d.documentElement.getBoundingClientRect().height) + 4);
    };
    const aoCarregar = () => {
      ajustar();
      const d = f.contentDocument;
      if (!d) return;
      ro?.disconnect();
      ro = new ResizeObserver(ajustar);
      ro.observe(d.body);
      d.querySelectorAll("img").forEach((i) => i.addEventListener("load", ajustar));
    };
    f.addEventListener("load", aoCarregar);
    const roFora = new ResizeObserver(ajustar);
    roFora.observe(f);
    if (f.contentDocument?.readyState === "complete") aoCarregar();
    return () => {
      f.removeEventListener("load", aoCarregar);
      ro?.disconnect();
      roFora.disconnect();
    };
  }, [pronto, verTexto]);

  if (!pronto || verTexto) {
    return (
      <div className="mt-3">
        <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
          {texto || "(mensagem sem texto)"}
        </p>
        {pronto && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-muted-foreground underline"
            onClick={() => setVerTexto(false)}
          >
            Ver formatado
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {pronto.remotasBloqueadas > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <ImageIcon className="size-4" /> Imagens bloqueadas nesta mensagem.
          <button
            type="button"
            className="font-semibold text-foreground underline"
            onClick={() => setImagens(true)}
          >
            Mostrar imagens
          </button>
        </div>
      )}
      <iframe
        ref={ref}
        title="Conteúdo do e-mail"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={pronto.html}
        style={{ height: altura }}
        className="block w-full rounded-lg border-0 bg-white"
      />
      {texto && (
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground underline"
          onClick={() => setVerTexto(true)}
        >
          Ver só o texto
        </button>
      )}
    </div>
  );
}
