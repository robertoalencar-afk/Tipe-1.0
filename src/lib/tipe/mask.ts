/** Máscaras exibidas no painel. O dado completo fica cifrado no banco. */
export function maskCpf(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return "***";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function maskPix(type: string, v: string) {
  if (type === "cpf") return maskCpf(v);
  if (type === "email") {
    const [, domain] = v.split("@");
    return domain ? `****@${domain}` : "****";
  }
  if (type === "phone") return v.length > 4 ? `****${v.slice(-4)}` : "****";
  return v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : "****";
}
