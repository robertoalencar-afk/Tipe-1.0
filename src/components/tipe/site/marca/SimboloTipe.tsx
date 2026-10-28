/**
 * Símbolo oficial da Tipe (as orelhas da lebre), com a mesma geometria de
 * src/assets/marca/tipe-simbolo.svg. Use no lugar de desenhos improvisados em avisos,
 * selos e ícones. `cor` troca só o preenchimento (ex.: "currentColor" para a versão
 * monocromática); a forma e a proporção nunca mudam.
 */
import { cn } from "@/lib/utils";
import { SIMBOLO } from "./logoTipeGeometria";

export const SIMBOLO_VIEWBOX = "62.3 57.3 141.1 138.5";

export function SimboloTipe({
  cor = "#0FC9BD",
  className,
  titulo = "",
}: {
  cor?: string;
  className?: string;
  /** Nome acessível; vazio (padrão) deixa o símbolo decorativo. */
  titulo?: string;
}) {
  return (
    <svg
      viewBox={SIMBOLO_VIEWBOX}
      role={titulo ? "img" : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path fill={cor} fillRule="evenodd" d={SIMBOLO} />
    </svg>
  );
}
