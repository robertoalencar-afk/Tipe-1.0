import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getPushPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/tipe/avisos.functions";

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

/** Botão "Avisos" da equipe: liga o aviso no celular mesmo com o app fechado. */
export function AvisosCelular() {
  const [estado, setEstado] = useState<Estado>("carregando");
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
    return estado === "ligado" ? desligar() : ligar();
  };

  const Icone = estado === "ligado" ? BellRing : estado === "bloqueado" ? BellOff : Bell;
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={clique}
      disabled={ocupado}
      aria-pressed={estado === "ligado"}
      title={
        estado === "ligado"
          ? "Desligar avisos no celular"
          : "Receber avisos no celular com o app fechado"
      }
      className={estado === "ligado" ? "text-foreground" : "text-muted-foreground"}
    >
      <Icone className="h-4 w-4" />
      {estado === "ligado" ? "Avisos ligados" : "Avisos"}
    </Button>
  );
}
