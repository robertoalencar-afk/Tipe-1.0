import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nfc } from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { GravadorEtiqueta } from "@/components/tipe/GravarEtiquetaNfc";
import { appClipIos, lerPedidoGravacao, modoGravacao, type ModoGravacao } from "@/lib/tipe/nfc";

/**
 * Página pública aberta pelo QR "Gravar com outro celular" (iPad, tablet ou computador).
 * Carrega só o endereço público da mesa, o mesmo impresso no QR do totem. Sem login.
 */
export const Route = createFileRoute("/gravar-nfc")({
  head: () => ({
    meta: [
      { title: "Gravar etiqueta NFC | Tipe" },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
      // Com o App Clip publicado, o Safari mostra o cartão "Abrir" que grava pelo iPhone.
      ...(appClipIos() ? [{ name: "apple-itunes-app", content: appClipIos()!.banner }] : []),
    ],
  }),
  component: GravarNfcPagina,
});

function GravarNfcPagina() {
  const params = Route.useSearch() as { u?: unknown; m?: unknown };
  const [estado, setEstado] = useState<{
    pedido: ReturnType<typeof lerPedidoGravacao>;
    modo: ModoGravacao;
  } | null>(null);
  useEffect(() => {
    setEstado({ pedido: lerPedidoGravacao(params, window.location.origin), modo: modoGravacao() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.u, params.m]);

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-background px-4 py-8 text-foreground">
      <TipeLogo className="h-7" variant="dark" />
      <h1 className="mt-6 flex items-center gap-2 text-xl font-semibold">
        <Nfc className="size-5" aria-hidden />
        Gravar etiqueta NFC
      </h1>
      {!estado ? null : !estado.pedido ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Este endereço de gravação não é válido. Gere um novo QR em Gestão → Totens.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">
            {estado.pedido.mesa ? `Mesa ${estado.pedido.mesa}. ` : ""}A etiqueta vai abrir o mesmo
            endereço do QR Code da mesa.
          </p>
          <p className="break-all rounded-md border border-border p-3 text-xs">
            {estado.pedido.link}
          </p>
          {estado.modo === "sem-nfc" ? (
            <p className="text-sm">
              Este aparelho não grava NFC por aqui. Abra esta página num Android com Chrome (NFC
              ligado) ou num iPhone.
            </p>
          ) : (
            <GravadorEtiqueta
              link={estado.pedido.link}
              mesa={estado.pedido.mesa}
              modo={estado.modo}
            />
          )}
        </div>
      )}
    </main>
  );
}
