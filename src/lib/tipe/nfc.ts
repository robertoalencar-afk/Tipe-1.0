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

/** Aceita só o endereço público HTTPS do QR (sem credenciais nem sessão de cliente). */
export function validarLinkMesa(link: string) {
  const url = new URL(link);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.searchParams.has("session") ||
    url.searchParams.has("session_token")
  )
    throw new Error("Use o endereço HTTPS do QR Code da mesa.");
  return url;
}

/** Como este aparelho pode gravar: Web NFC (Chrome Android), iPhone (app gratuito) ou sem NFC (iPad, PC, tablet sem NFC). */
export type ModoGravacao = "webnfc" | "iphone" | "sem-nfc";

export function modoGravacao(): ModoGravacao {
  if (gravadorDisponivel()) return "webnfc";
  if (typeof navigator === "undefined") return "sem-nfc";
  // iPad (inclusive iPadOS que se apresenta como Mac) não tem leitor NFC.
  return /iPhone|iPod/.test(navigator.userAgent) ? "iphone" : "sem-nfc";
}

/** App gratuito que grava URL NDEF no iPhone (Core NFC). Safari/Chrome no iOS não gravam NFC. */
export const NFC_TOOLS_IOS = "https://apps.apple.com/br/app/nfc-tools/id1252962749";

/** Página pública que abre no celular que vai gravar (passagem por QR a partir de iPad, PC ou tablet). */
export function linkGravacaoRemota(origem: string, link: string, mesa: string) {
  const url = new URL("/gravar-nfc", origem);
  url.searchParams.set("u", validarLinkMesa(link).href);
  url.searchParams.set("m", mesa);
  return url.href;
}

/** Lê o pedido da página pública. Só aceita link da mesma origem da Tipe, para a página não gravar endereços de terceiros. */
export function lerPedidoGravacao(params: { u?: unknown; m?: unknown }, origem: string) {
  if (typeof params.u !== "string") return null;
  try {
    const url = validarLinkMesa(params.u);
    if (url.host !== new URL(origem).host) return null;
    const m = params.m;
    const mesa = typeof m === "string" || typeof m === "number" ? String(m).slice(0, 20) : "";
    return { link: url.href, mesa };
  } catch {
    return null;
  }
}

/** Grava só o endereço público do QR. Nunca bloqueia a etiqueta como somente leitura. */
export function gravarLinkMesa(
  Reader: ConstrutorNfc,
  link: string,
  signal: AbortSignal,
  overwrite = false,
) {
  const url = validarLinkMesa(link);
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
