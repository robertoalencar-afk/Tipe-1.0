/**
 * Logomarca do restaurante na área do cliente (conta do Tipe Pay e cardápio do Tipe Order).
 * Sem logo cadastrada, mostra a inicial do nome num círculo na cor da marca, para a tela
 * nunca ficar com um buraco. A imagem vem do bucket público do restaurante.
 */
export function MarcaRestaurante({ nome, logoUrl, detalhe, tamanho = 40 }: { nome: string; logoUrl?: string | null | undefined; detalhe?: string | undefined; tamanho?: number }) {
  if (!nome) return null;
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-[3px] font-display text-[1.1rem] font-semibold text-[#03665f] shadow-sm ring-1 ring-black/10"
        style={{ width: tamanho, height: tamanho }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={`Logomarca ${nome}`} width={tamanho} height={tamanho} className="h-full w-full rounded-[0.85rem] object-cover" decoding="async" />
        ) : (
          nome.trim().charAt(0).toUpperCase()
        )}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-[1.2rem] font-medium leading-tight tracking-[-0.025em]">{nome}</span>
        {detalhe && <span className="block truncate text-xs text-muted-foreground">{detalhe}</span>}
      </span>
    </div>
  );
}
