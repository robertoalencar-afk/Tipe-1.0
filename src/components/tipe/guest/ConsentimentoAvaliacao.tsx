import type { PublicIdentity, REVIEW_CONSENT_TEXT } from "@/lib/tipe/guest/review-consent";

/** Pergunta separada e opcional, desmarcada por padrão. Só aparece com a flag do Guest ligada. */
export function ConsentimentoAvaliacao({
  texto,
  consentiu,
  onConsentir,
  identidade,
  onIdentidade,
}: {
  texto: typeof REVIEW_CONSENT_TEXT;
  consentiu: boolean;
  onConsentir: (v: boolean) => void;
  identidade: PublicIdentity;
  onIdentidade: (v: PublicIdentity) => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <label htmlFor="consentimento-guest" className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          id="consentimento-guest"
          type="checkbox"
          checked={consentiu}
          onChange={(e) => onConsentir(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
        />
        <span className="text-sm font-semibold leading-5">{texto.question}</span>
      </label>
      <p className="mt-2 pl-8 text-xs leading-5 text-muted-foreground">
        {texto.detail}{" "}
        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Privacidade
        </a>
      </p>
      {consentiu && (
        <fieldset className="mt-3 pl-8">
          <legend className="text-xs font-semibold">{texto.identityLabel}</legend>
          <div className="mt-2 flex flex-col gap-1">
            {(
              [
                ["anonimo", texto.identityAnonymous],
                ["primeiro_nome", texto.identityFirstName],
              ] as const
            ).map(([valor, rotulo]) => (
              <label key={valor} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="identidade-guest"
                  value={valor}
                  checked={identidade === valor}
                  onChange={() => onIdentidade(valor)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {rotulo}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
