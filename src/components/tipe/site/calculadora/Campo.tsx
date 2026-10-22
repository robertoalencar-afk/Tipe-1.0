/**
 * Campo da calculadora: rótulo visível, número editável e slider no mesmo bloco.
 * O texto aceita vírgula decimal; o slider vai até `max`, mas o campo aceita
 * valores maiores (o slider fica no fim). Campos opcionais aceitam ficar vazios.
 */
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { lerNumero, numero } from "@/lib/tipe/giro/formato";

export type Tom = "claro" | "escuro";

/** Estilo do slider, compartilhado. Fica num <style> local (styles.css é de outro escopo). */
export const ESTILO_SLIDER = `
.giro-range{-webkit-appearance:none;appearance:none;width:100%;height:28px;background:transparent;cursor:pointer;touch-action:pan-y;margin:0;display:block}
.giro-range:focus{outline:none}
.giro-range::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:linear-gradient(to right,var(--trilho-cheio) 0 var(--p),var(--trilho) var(--p) 100%)}
.giro-range::-moz-range-track{height:4px;border-radius:999px;background:var(--trilho)}
.giro-range::-moz-range-progress{height:4px;border-radius:999px;background:var(--trilho-cheio)}
.giro-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;margin-top:-8px;border-radius:999px;background:#fff;border:0;box-shadow:0 0 0 1px rgb(2 30 52/.18),0 2px 6px rgb(2 30 52/.25);transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s}
.giro-range::-moz-range-thumb{width:20px;height:20px;border-radius:999px;background:#fff;border:0;box-shadow:0 0 0 1px rgb(2 30 52/.18),0 2px 6px rgb(2 30 52/.25)}
.giro-range:hover::-webkit-slider-thumb{transform:scale(1.08)}
.giro-range:active::-webkit-slider-thumb{transform:scale(1.15)}
.giro-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px var(--anel),0 2px 6px rgb(2 30 52/.25)}
.giro-range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px var(--anel),0 2px 6px rgb(2 30 52/.25)}
.giro-tom-claro{--trilho:rgb(2 30 52/.12);--trilho-cheio:#021E34;--anel:#0FC9BD}
.giro-tom-escuro{--trilho:rgb(255 255 255/.16);--trilho-cheio:#0FC9BD;--anel:#fff}
@media (prefers-reduced-motion:reduce){.giro-range::-webkit-slider-thumb{transition:none}}
`;

export function BotaoAjuda({
  aberto,
  onClick,
  controla,
  rotulo,
  tom = "claro",
}: {
  aberto: boolean;
  onClick: () => void;
  controla: string;
  rotulo: string;
  tom?: Tom;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      aria-controls={controla}
      aria-label={`Explicar: ${rotulo}`}
      title={`Explicar: ${rotulo}`}
      className={cn(
        "relative grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors before:absolute before:-inset-2 before:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        tom === "claro"
          ? "text-[#021E34]/45 hover:bg-[#021E34]/[0.06] hover:text-[#021E34] focus-visible:outline-[#0FC9BD]"
          : "text-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-white",
        aberto && (tom === "claro" ? "bg-[#021E34]/[0.06] text-[#021E34]" : "bg-white/10 text-white"),
      )}
    >
      <Info className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

export function Campo({
  rotulo,
  valor,
  onChange,
  min,
  max,
  passo = 1,
  prefixo,
  sufixo,
  casas = 0,
  ajuda,
  opcional = false,
  tom = "claro",
  destaque = false,
  extra,
  placeholder,
}: {
  rotulo: string;
  valor: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  passo?: number;
  prefixo?: string;
  sufixo?: string;
  casas?: number;
  ajuda?: ReactNode;
  opcional?: boolean;
  tom?: Tom;
  destaque?: boolean;
  extra?: ReactNode;
  /** Texto curto mostrado no campo vazio (só em campos opcionais). */
  placeholder?: string;
}) {
  const id = useId();
  const [texto, setTexto] = useState(valor === null ? "" : numero(valor, casas));
  const [editando, setEditando] = useState(false);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!editando) setTexto(valor === null ? "" : numero(valor, casas));
  }, [valor, casas, editando]);

  const noSlider = valor === null ? min : Math.min(max, Math.max(min, valor));
  const p = max > min ? ((noSlider - min) / (max - min)) * 100 : 0;
  const escuro = tom === "escuro";

  return (
    <div className={cn("giro-campo", escuro ? "giro-tom-escuro" : "giro-tom-claro")}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={`${id}-n`}
          className={cn(
            "min-w-0 flex-1 text-[0.875rem] leading-tight",
            escuro ? "text-white/80" : "text-[#021E34]/75",
            destaque && (escuro ? "text-white" : "text-[#021E34]"),
          )}
        >
          {rotulo}
          {opcional && <span className={escuro ? "text-white/45" : "text-[#021E34]/40"}> · opcional</span>}
        </label>
        {ajuda && (
          <BotaoAjuda
            aberto={aberto}
            onClick={() => setAberto((a) => !a)}
            controla={`${id}-ajuda`}
            rotulo={rotulo}
            tom={tom}
          />
        )}
        <div
          className={cn(
            "flex h-9 shrink-0 items-center gap-1 rounded-[0.7rem] border px-2.5 transition-colors focus-within:border-[#0FC9BD]",
            escuro ? "border-white/15 bg-white/[0.06] text-white" : "border-[#021E34]/12 bg-white text-[#021E34]",
          )}
        >
          {prefixo && <span className={cn("text-[0.8rem]", escuro ? "text-white/55" : "text-[#021E34]/50")}>{prefixo}</span>}
          <input
            id={`${id}-n`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={texto}
            placeholder={opcional ? (placeholder ?? "—") : undefined}
            onFocus={() => setEditando(true)}
            onBlur={() => {
              setEditando(false);
              const n = lerNumero(texto);
              if (n !== null) setTexto(numero(Math.max(min, n), casas));
              else if (opcional) {
                onChange(null);
                setTexto("");
              } else setTexto(numero(valor ?? min, casas));
            }}
            onChange={(e) => {
              setTexto(e.target.value);
              const n = lerNumero(e.target.value);
              if (n !== null) onChange(Math.max(min, n));
              else if (opcional && e.target.value.trim() === "") onChange(null);
            }}
            className={cn(
              "money w-[4.6ch] min-w-0 bg-transparent text-right text-[0.95rem] font-medium tabular-nums outline-none",
              (prefixo || (texto.length > 4)) && "w-[6.2ch]",
              placeholder && texto === "" && "w-[9.5ch] placeholder:text-[0.8rem] placeholder:font-normal",
              escuro ? "placeholder:text-white/40" : "placeholder:text-[#021E34]/40",
            )}
          />
          {sufixo && <span className={cn("text-[0.8rem]", escuro ? "text-white/55" : "text-[#021E34]/50")}>{sufixo}</span>}
        </div>
      </div>
      <input
        type="range"
        aria-label={rotulo}
        min={min}
        max={max}
        step={passo}
        value={noSlider}
        onChange={(e) => onChange(Number(e.target.value))}
        className="giro-range mt-1"
        style={{ "--p": `${p}%` } as CSSProperties}
      />
      {extra}
      {ajuda && (
        <p
          id={`${id}-ajuda`}
          hidden={!aberto}
          className={cn(
            "mt-1 rounded-[0.8rem] px-3 py-2.5 text-[0.8rem] leading-relaxed",
            escuro ? "bg-white/[0.07] text-white/75" : "bg-[#021E34]/[0.04] text-[#021E34]/70",
          )}
        >
          {ajuda}
        </p>
      )}
    </div>
  );
}
