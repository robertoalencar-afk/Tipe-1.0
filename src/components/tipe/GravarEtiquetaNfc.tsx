import { useEffect, useRef, useState } from "react";
import { Copy, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gravadorDisponivel, gravarLinkMesa, erroGravacaoNfc } from "@/lib/tipe/nfc";

export function GravarEtiquetaNfc({
  mesas,
  restaurante,
}: {
  mesas: { id: string; number: string; url: string }[];
  restaurante: string;
}) {
  const [id, setId] = useState("");
  const [suporta, setSuporta] = useState(false);
  const [substituir, setSubstituir] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const controlador = useRef<AbortController | null>(null);
  const mesa = mesas.find((m) => m.id === id) ?? mesas[0];
  const linkAtual = useRef(mesa?.url);
  linkAtual.current = mesa?.url;
  useEffect(() => {
    setSuporta(!!gravadorDisponivel());
    return () => {
      controlador.current?.abort();
      controlador.current = null;
    };
  }, []);
  useEffect(() => {
    controlador.current?.abort();
    limparAviso();
  }, [mesa?.url]);
  function limparAviso() {
    setAviso("");
    setSubstituir(false);
  }

  async function gravar() {
    const Reader = gravadorDisponivel();
    if (!Reader || !mesa || controlador.current) return;
    const url = mesa.url;
    const controller = new AbortController();
    controlador.current = controller;
    setOcupado(true);
    setAviso(
      `Aproxime a etiqueta NFC para gravar a Mesa ${mesa.number}. Mantenha o celular próximo até concluir.`,
    );
    const timer = window.setTimeout(() => controller.abort(), 60000);
    try {
      await gravarLinkMesa(Reader, url, controller.signal, substituir);
      if (controlador.current === controller && linkAtual.current === url)
        setAviso(
          `Etiqueta gravada para a Mesa ${mesa.number}. Teste aproximando um celular e confirme a mesa aberta.`,
        );
    } catch (e) {
      if (controlador.current === controller && linkAtual.current === url)
        setAviso(erroGravacaoNfc(e));
    } finally {
      window.clearTimeout(timer);
      if (controlador.current === controller) {
        controlador.current = null;
        setOcupado(false);
      }
    }
  }
  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Gravação de etiquetas NFC">
      <h4 className="flex items-center gap-2 font-semibold">
        <Nfc className="size-4" aria-hidden />
        Gravar etiqueta NFC
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Grave uma etiqueta por mesa com o mesmo endereço do QR Code. Depois, cole a etiqueta no
        totem.
      </p>
      {mesa ? (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-medium">
            Mesa de {restaurante}
            <select
              className="mt-1 block h-11 w-full rounded-md border border-input bg-background px-3"
              value={mesa.id}
              disabled={ocupado}
              onChange={(e) => setId(e.target.value)}
            >
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>
                  Mesa {m.number}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Endereço para gravar
            <input
              readOnly
              value={mesa.url}
              className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-xs"
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(mesa.url);
                  setAviso(
                    "Link copiado. No NFC Tools, escolha Escrever → Adicionar registro → URL/URI e grave na etiqueta.",
                  );
                } catch {
                  setAviso("Selecione e copie o endereço acima para usar no NFC Tools.");
                }
              }}
            >
              <Copy className="size-4" />
              Copiar para NFC Tools
            </Button>
            {suporta && (
              <Button type="button" disabled={ocupado} onClick={() => void gravar()}>
                <Nfc className="size-4" />
                {ocupado ? "Aguardando etiqueta…" : "Gravar etiqueta NFC"}
              </Button>
            )}
            {ocupado && (
              <Button type="button" variant="ghost" onClick={() => controlador.current?.abort()}>
                Cancelar
              </Button>
            )}
          </div>
          {suporta ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={substituir}
                disabled={ocupado}
                onChange={(e) => setSubstituir(e.target.checked)}
              />
              Substituir o conteúdo de uma etiqueta já gravada.
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">
              Para gravar direto pela Gestão, abra esta página no Chrome de um Android com NFC.
              Neste navegador, use o link no NFC Tools.
            </p>
          )}
          <p role="status" className="text-sm text-muted-foreground">
            {aviso}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Ative uma mesa para preparar sua etiqueta.
        </p>
      )}
    </section>
  );
}
