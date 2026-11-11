import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Faixa discreta quando o aparelho perde a conexão; some sozinha quando a internet volta. */
export function AvisoSemInternet() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-center text-sm font-medium text-background"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      Sem internet. Assim que a conexão voltar, a página continua de onde parou.
    </div>
  );
}
