import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  getPushPreferences,
  getPushPublicKey,
  removePushSubscription,
  savePushSubscription,
  setPushPreferences,
} from "@/lib/tipe/avisos.functions";
import { NOME_TIPO_AVISO, type TipoAviso } from "@/lib/tipe/avisos-equipe";

type Estado = "carregando" | "sem-suporte" | "iphone" | "desligado" | "ligado" | "bloqueado";

const SW = "/sw-avisos.js";

function chaveBytes(b64: string) {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function estadoInicial(): Estado {
  if (typeof window === "undefined") return "carregando";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const instalado =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  // No iPhone, o aviso só funciona com o site adicionado à tela de início.
  if (ios && !instalado) return "iphone";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  return "carregando";
}

// Cada área mostra só os tipos que chegam para ela (gorjeta e saque são do garçom).
const TIPOS_POR_PAPEL: Record<"garcom" | "gestao", TipoAviso[]> = {
  garcom: ["pagamento", "gorjeta", "nota", "saque"],
  gestao: ["pagamento", "nota"],
};

/** Botão "Avisos" da equipe: liga o aviso no celular mesmo com o app fechado. */
export function AvisosCelular({ papel = "garcom" }: { papel?: "garcom" | "gestao" }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [silenciados, setSilenciados] = useState<TipoAviso[]>([]);
  const lerPreferencias = useServerFn(getPushPreferences);
  const gravarPreferencias = useServerFn(setPushPreferences);
  const [ocupado, setOcupado] = useState(false);
  const chave = useServerFn(getPushPublicKey);
  const salvar = useServerFn(savePushSubscription);
  const remover = useServerFn(removePushSubscription);

  useEffect(() => {
    const e = estadoInicial();
    if (e !== "carregando") return setEstado(e);
    navigator.serviceWorker
      .getRegistration(SW)
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) =>
        setEstado(sub && Notification.permission === "granted" ? "ligado" : "desligado"),
      )
      .catch(() => setEstado("desligado"));
  }, []);

  if (estado === "carregando" || estado === "sem-suporte") return null;

  async function ligar() {
    setOcupado(true);
    try {
      const { publicKey } = await chave();
      if (!publicKey) throw new Error("Os avisos no celular ainda não foram ativados pela TIPE.");
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const reg = await navigator.serviceWorker.register(SW);
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveBytes(publicKey),
        }));
      const j = sub.toJSON();
      await salvar({
        data: {
          endpoint: sub.endpoint,
          p256dh: j.keys?.["p256dh"] ?? "",
          auth: j.keys?.["auth"] ?? "",
        },
      });
      setEstado("ligado");
      toast.success(
        "Avisos ligados. Você recebe pagamentos e notas baixas mesmo com o app fechado.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ligar os avisos");
    } finally {
      setOcupado(false);
    }
  }

  async function endpointAtual() {
    const reg = await navigator.serviceWorker.getRegistration(SW);
    return (await reg?.pushManager.getSubscription())?.endpoint ?? null;
  }

  async function abrirPreferencias(aberto: boolean) {
    if (!aberto) return;
    try {
      const endpoint = await endpointAtual();
      if (endpoint) setSilenciados((await lerPreferencias({ data: { endpoint } })).muted);
    } catch {
      /* mantém o que estava na tela */
    }
  }

  async function alternarTipo(tipo: TipoAviso, receber: boolean) {
    const antes = silenciados;
    const depois = receber ? antes.filter((t) => t !== tipo) : [...antes, tipo];
    setSilenciados(depois);
    try {
      const endpoint = await endpointAtual();
      if (!endpoint) throw new Error("Ligue os avisos de novo neste celular.");
      await gravarPreferencias({ data: { endpoint, muted: depois } });
    } catch (e) {
      setSilenciados(antes);
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    }
  }

  async function desligar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remover({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setEstado("desligado");
      toast("Avisos no celular desligados.");
    } catch {
      toast.error("Não foi possível desligar os avisos");
    } finally {
      setOcupado(false);
    }
  }

  const clique = () => {
    if (estado === "iphone")
      return toast(
        'No iPhone, toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra a TIPE por lá e ligue os avisos.',
      );
    if (estado === "bloqueado")
      return toast(
        "Os avisos estão bloqueados neste navegador. Libere as notificações da TIPE nos ajustes do navegador.",
      );
    return ligar();
  };

  const Icone = Smartphone;
  if (estado === "ligado")
    return (
      <Popover onOpenChange={(aberto) => void abrirPreferencias(aberto)}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            disabled={ocupado}
            title="Escolher quais avisos receber no celular"
            aria-label="Avisos no celular ligados: escolher preferências"
            className="text-foreground"
          >
            <Icone className="h-4 w-4" />
            <span className="hidden sm:inline">Avisos no celular ligados</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <p className="text-sm font-semibold">Avisos neste celular</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chegam mesmo com o app fechado. Escolha o que receber.
          </p>
          <ul className="mt-3 space-y-2.5">
            {TIPOS_POR_PAPEL[papel].map((tipo) => (
              <li key={tipo} className="flex items-center justify-between gap-3">
                <label htmlFor={`aviso-${tipo}`} className="text-sm">
                  {NOME_TIPO_AVISO[tipo]}
                </label>
                <Switch
                  id={`aviso-${tipo}`}
                  checked={!silenciados.includes(tipo)}
                  onCheckedChange={(v) => void alternarTipo(tipo, v)}
                />
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void desligar()}
            disabled={ocupado}
            className="mt-4 w-full"
          >
            Desligar avisos neste celular
          </Button>
        </PopoverContent>
      </Popover>
    );
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={clique}
      disabled={ocupado}
      aria-pressed={false}
      title="Receber avisos no celular com o app fechado"
      aria-label="Receber avisos no celular com o app fechado"
      className="text-muted-foreground"
    >
      <Icone className="h-4 w-4" />
      <span className="hidden sm:inline">Avisos no celular</span>
    </Button>
  );
}
