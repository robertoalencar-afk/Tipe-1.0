import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { avaliarSenha, ROTULO_FORCA, SENHA_MAX, SENHA_MIN } from "@/lib/tipe/senha";
import { cn } from "@/lib/utils";

const COR = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

/** Campo de nova senha com a política da Tipe: medidor de força e o que falta, sem bloquear a digitação. */
export function SenhaForteInput({
  id,
  label = "Senha",
  value,
  onChange,
  contexto,
  className,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  contexto?: { email?: string; nomes?: string[] };
  className?: string;
}) {
  const [ver, setVer] = useState(false);
  const r = avaliarSenha(value, contexto);
  const dica = `${id}-dica`;
  return (
    <div className={cn("space-y-2", className)}>
      {label && <label htmlFor={id} className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <Input
          id={id}
          type={ver ? "text" : "password"}
          required
          minLength={SENHA_MIN}
          maxLength={SENHA_MAX}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          aria-describedby={dica}
          aria-invalid={value.length > 0 && !r.ok}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Esconder senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div id={dica} aria-live="polite" className="space-y-1.5">
        {value.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full bg-muted", r.forca >= i && COR[r.forca])} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{ROTULO_FORCA[r.forca]}</span>
          </div>
        )}
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">Pelo menos {SENHA_MIN} caracteres, com letras e números. Uma frase curta é fácil de lembrar e difícil de adivinhar.</p>
        ) : r.faltam.length > 0 ? (
          <ul className="text-xs text-muted-foreground">{r.faltam.map((f) => <li key={f}>• {f}</li>)}</ul>
        ) : null}
      </div>
    </div>
  );
}
