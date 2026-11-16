export interface GravadorNfc {
  write(
    message: { records: { recordType: "url"; data: string }[] },
    options: { overwrite: boolean; signal: AbortSignal },
  ): Promise<void>;
}
export type ConstrutorNfc = new () => GravadorNfc;

export function gravadorDisponivel(): ConstrutorNfc | null {
  if (typeof window === "undefined" || !window.isSecureContext || window.top !== window.self)
    return null;
  return (window as unknown as { NDEFReader?: ConstrutorNfc }).NDEFReader ?? null;
}

/** Grava só o endereço público do QR. Nunca bloqueia a etiqueta como somente leitura. */
export function gravarLinkMesa(
  Reader: ConstrutorNfc,
  link: string,
  signal: AbortSignal,
  overwrite = false,
) {
  const url = new URL(link);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.searchParams.has("session") ||
    url.searchParams.has("session_token")
  )
    throw new Error("Use o endereço HTTPS do QR Code da mesa.");
  return new Reader().write(
    { records: [{ recordType: "url", data: url.href }] },
    { overwrite, signal },
  );
}

export function erroGravacaoNfc(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError")
    return "Gravação cancelada. Aproxime a etiqueta e tente novamente quando estiver pronto.";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Permita o acesso ao NFC neste navegador e tente novamente.";
  if (name === "NotSupportedError")
    return "Este aparelho ou etiqueta não oferece a gravação NFC necessária. Use um celular Android com NFC, Chrome e uma etiqueta NDEF compatível.";
  return "Não foi possível gravar. Ative o NFC, mantenha a etiqueta próxima e confira se está vazia, desbloqueada e tem espaço. Para substituir um link existente, marque a opção abaixo.";
}
