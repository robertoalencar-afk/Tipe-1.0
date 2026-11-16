import type { MenuPhotoCredit as Credit, MenuLanguage } from "@/lib/tipe/menu-intelligence";

/** Keep illustrative photos honest and reusable image attribution close to the image. */
export function MenuPhotoCredit({
  credit,
  language = "pt",
  inverse = false,
  onOpen,
}: {
  credit?: Credit | undefined;
  language?: MenuLanguage;
  inverse?: boolean;
  onOpen?: () => void;
}) {
  if (!credit) return null;
  const copy = {
    pt: { illustrative: "Foto ilustrativa", credits: "Créditos da foto", source: "Fonte" },
    en: { illustrative: "Illustrative photo", credits: "Photo credits", source: "Source" },
    es: { illustrative: "Foto ilustrativa", credits: "Créditos de la foto", source: "Fuente" },
  }[language];
  return (
    <details
      onToggle={(event) => {
        if (event.currentTarget.open) onOpen?.();
      }}
      className={`mt-1 text-xs leading-relaxed ${inverse ? "text-white/90" : "text-muted-foreground"}`}
    >
      <summary className="min-h-7 cursor-pointer py-1 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        {credit.illustrative ? `${copy.illustrative} · ${copy.credits}` : copy.credits}
      </summary>
      <p className="break-words pb-1">
        {credit.author} ·{" "}
        {credit.licenseUrl ? (
          <a
            href={credit.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {credit.license}
          </a>
        ) : (
          credit.license
        )}
        {" · "}
        <a
          href={credit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {copy.source}
        </a>
        {credit.changes ? ` · ${credit.changes}` : ""}
      </p>
    </details>
  );
}
