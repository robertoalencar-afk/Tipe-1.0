import { useEffect, useRef, useState } from "react";
import { Check, Copy, Nfc, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  NFC_TOOLS_IOS,
  erroGravacaoNfc,
  gravadorDisponivel,
  gravarLinkMesa,
  linkGravacaoRemota,
  modoGravacao,
  type ModoGravacao,
} from "@/lib/tipe/nfc";

/** Painel da Gestão: escolhe a mesa e grava pelo meio que o aparelho permitir. */
export function GravarEtiquetaNfc({
  mesas,
  restaurante,
}: {
  mesas: { id: string; number: string; url: string }[];
  restaurante: string;
}) {
  const [id, setId] = useState("");
  const [modo, setModo] = useState<ModoGravacao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const mesa = mesas.find((m) => m.id === id) ?? mesas[0];
  useEffect(() => setModo(modoGravacao()), []);

  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Gravação de etiquetas NFC">
      <h4 className="flex items-center gap-2 font-semibold">
        <Nfc className="size-4" aria-hidden />
        Gravar etiqueta NFC
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Grave uma etiqueta por mesa com o mesmo endereço do QR Code e cole no totem ou na pulseira.
        Funciona no Android com Chrome, no iPhone com um app gratuito e, a partir de iPad, tablet ou
        computador, enviando a gravação para um celular pelo QR Code.
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
          {modo && (
            <GravadorEtiqueta
              key={mesa.url}
              link={mesa.url}
              mesa={mesa.number}
              modo={modo}
              onOcupado={setOcupado}
            />
          )}
          {modo === "sem-nfc" && <EnviarParaCelular link={mesa.url} mesa={mesa.number} />}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Ative uma mesa para preparar sua etiqueta.
        </p>
      )}
    </section>
  );
}

/** Grava um link de mesa conforme o aparelho. Usado na Gestão e na página pública /gravar-nfc. */
export function GravadorEtiqueta({
  link,
  mesa,
  modo,
  onOcupado,
}: {
  link: string;
  mesa: string;
  modo: ModoGravacao;
  onOcupado?: ((ocupado: boolean) => void) | undefined;
}) {
  if (modo === "webnfc") return <GravarWebNfc link={link} mesa={mesa} onOcupado={onOcupado} />;
  if (modo === "iphone") return <GravarIphone link={link} mesa={mesa} />;
  return null;
}

function GravarWebNfc({
  link,
  mesa,
  onOcupado,
}: {
  link: string;
  mesa: string;
  onOcupado?: ((ocupado: boolean) => void) | undefined;
}) {
  const [substituir, setSubstituir] = useState(false);
  const [ocupado, setOcupadoLocal] = useState(false);
  const [aviso, setAviso] = useState("");
  const controlador = useRef<AbortController | null>(null);
  const setOcupado = (v: boolean) => {
    setOcupadoLocal(v);
    onOcupado?.(v);
  };
  useEffect(
    () => () => {
      controlador.current?.abort();
      controlador.current = null;
      onOcupado?.(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function gravar() {
    const Reader = gravadorDisponivel();
    if (!Reader || controlador.current) return;
    const controller = new AbortController();
    controlador.current = controller;
    setOcupado(true);
    setAviso(
      `Aproxime a etiqueta NFC para gravar a Mesa ${mesa}. Mantenha o celular próximo até concluir.`,
    );
    const timer = window.setTimeout(() => controller.abort(), 60000);
    try {
      await gravarLinkMesa(Reader, link, controller.signal, substituir);
      if (controlador.current === controller)
        setAviso(
          `Etiqueta gravada para a Mesa ${mesa}. Teste aproximando um celular e confirme a mesa aberta.`,
        );
    } catch (e) {
      if (controlador.current === controller) setAviso(erroGravacaoNfc(e));
    } finally {
      window.clearTimeout(timer);
      if (controlador.current === controller) {
        controlador.current = null;
        setOcupado(false);
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={ocupado} onClick={() => void gravar()}>
          <Nfc className="size-4" />
          {ocupado ? "Aguardando etiqueta…" : "Gravar pelo celular"}
        </Button>
        {ocupado && (
          <Button type="button" variant="ghost" onClick={() => controlador.current?.abort()}>
            Cancelar
          </Button>
        )}
      </div>
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
      <p role="status" className="text-sm text-muted-foreground">
        {aviso}
      </p>
    </div>
  );
}

function GravarIphone({ link, mesa }: { link: string; mesa: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 4000);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm">
        O iPhone grava a etiqueta pelo app gratuito <strong>NFC Tools</strong>. Safari e Chrome no
        iPhone não gravam NFC direto do site.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void copiar()}>
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? "Endereço copiado" : `Copiar endereço da Mesa ${mesa}`}
        </Button>
        <Button asChild variant="outline">
          <a href={NFC_TOOLS_IOS} target="_blank" rel="noopener noreferrer">
            Baixar NFC Tools
          </a>
        </Button>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Copie o endereço acima.</li>
        <li>No NFC Tools, toque em Escrever → Adicionar um registro → URL/URI.</li>
        <li>Cole o endereço, confirme e toque em Escrever (1 registro).</li>
        <li>Encoste a etiqueta no topo do iPhone até aparecer a confirmação.</li>
        <li>Teste: aproxime o iPhone da etiqueta e confirme que abre a Mesa {mesa}.</li>
      </ol>
      <p className="text-xs text-muted-foreground">
        Não use “Bloquear etiqueta” no app: a etiqueta precisa continuar regravável.
      </p>
    </div>
  );
}

/** iPad, tablet ou computador sem NFC: mostra um QR que abre a gravação desta mesa no celular. */
function EnviarParaCelular({ link, mesa }: { link: string; mesa: string }) {
  const [remoto, setRemoto] = useState("");
  useEffect(() => {
    try {
      setRemoto(linkGravacaoRemota(window.location.origin, link, mesa));
    } catch {
      setRemoto("");
    }
  }, [link, mesa]);
  if (!remoto) return null;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center">
      <div className="w-fit rounded-md bg-white p-2">
        <QRCodeSVG value={remoto} size={132} aria-label={`QR para gravar a Mesa ${mesa}`} />
      </div>
      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Smartphone className="size-4" aria-hidden />
          Gravar com outro celular
        </p>
        <p className="text-muted-foreground">
          Este aparelho não grava NFC (iPad e a maioria dos computadores não têm leitor). Aponte a
          câmera de um Android com Chrome ou de um iPhone para este QR: a gravação da Mesa {mesa}{" "}
          abre lá, sem login.
        </p>
      </div>
    </div>
  );
}
