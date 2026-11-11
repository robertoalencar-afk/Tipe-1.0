import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfiguracaoImpressaoFiscal,
  impressaoFiscalInicial,
  lerConfiguracaoImpressaoFiscal,
} from "@/lib/tipe/fiscal/printing";

const fieldClass = "mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
export function FiscalImpressao({ slug }: { slug: string }) {
  const [config, setConfig] = useState(impressaoFiscalInicial);
  const [loaded, setLoaded] = useState(false);
  const key = `tipe:fiscal-printer:v1:${slug}`;
  useEffect(() => {
    try {
      setConfig(lerConfiguracaoImpressaoFiscal(localStorage.getItem(key)));
    } catch {
      setConfig({ ...impressaoFiscalInicial });
    }
    setLoaded(true);
  }, [key]);
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(ConfiguracaoImpressaoFiscal.parse(config)));
      toast.success("Preferências de impressão salvas neste dispositivo");
    } catch {
      toast.error("Não foi possível salvar neste navegador");
    }
  }
  return (
    <section className="surface-card p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <Printer className="mt-1 size-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">Impressora de cupons</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configure o equipamento usado neste caixa. As preferências ficam neste dispositivo, por
            restaurante.
          </p>
        </div>
      </div>
      <fieldset disabled={!loaded} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Conexão
          <select
            className={fieldClass}
            value={config.connection}
            onChange={(e) =>
              setConfig({ ...config, connection: e.target.value as typeof config.connection })
            }
          >
            <option value="usb">USB</option>
            <option value="network">Rede · Ethernet ou Wi-Fi</option>
            <option value="bluetooth">Bluetooth</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Sistema do caixa
          <select
            className={fieldClass}
            value={config.system}
            onChange={(e) =>
              setConfig({ ...config, system: e.target.value as typeof config.system })
            }
          >
            <option value="windows">Windows</option>
            <option value="macos">macOS</option>
            <option value="linux">Linux</option>
            <option value="android">Android</option>
            <option value="ios">iPhone ou iPad</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Papel
          <select
            className={fieldClass}
            value={config.paper}
            onChange={(e) => setConfig({ ...config, paper: e.target.value as typeof config.paper })}
          >
            <option value="58">Bobina de 58 mm</option>
            <option value="80">Bobina de 80 mm</option>
            <option value="a4">A4</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Nome ou modelo da impressora · opcional
          <Input
            className="mt-1 h-11"
            value={config.printerName}
            maxLength={100}
            onChange={(e) => setConfig({ ...config, printerName: e.target.value })}
            placeholder="Ex.: impressora do caixa"
          />
        </label>
        <div className="rounded-xl bg-muted/50 p-4 text-sm sm:col-span-2">
          <p className="font-medium">Impressão pelo sistema do dispositivo</p>
          <p className="mt-1 text-muted-foreground">
            Instale ou conecte a impressora no sistema e escolha-a na janela de impressão. A
            disponibilidade por USB, rede ou Bluetooth depende do equipamento, do driver e do
            sistema escolhido.
          </p>
          <p className="mt-2 text-muted-foreground">
            O cupom usa o DANFC-e autorizado. Uma reimpressão mantém a mesma nota. A impressão
            automática sem essa janela exige uma integração local compatível com o equipamento.
          </p>
        </div>
        <div>
          <Button disabled={!loaded} onClick={save}>
            Salvar preferências de impressão
          </Button>
        </div>
      </fieldset>
    </section>
  );
}
