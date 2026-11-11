import { z } from "zod";

export const ConfiguracaoImpressaoFiscal = z
  .object({
    version: z.literal(1),
    connection: z.enum(["usb", "network", "bluetooth"]),
    system: z.enum(["windows", "macos", "linux", "android", "ios"]),
    paper: z.enum(["58", "80", "a4"]),
    printerName: z.string().trim().max(100),
  })
  .strict();
export type ConfiguracaoImpressaoFiscal = z.infer<typeof ConfiguracaoImpressaoFiscal>;
export const impressaoFiscalInicial: ConfiguracaoImpressaoFiscal = {
  version: 1,
  connection: "usb",
  system: "windows",
  paper: "80",
  printerName: "",
};
export function lerConfiguracaoImpressaoFiscal(raw: string | null) {
  try {
    return ConfiguracaoImpressaoFiscal.parse(JSON.parse(raw ?? "null"));
  } catch {
    return { ...impressaoFiscalInicial };
  }
}
export function podeImprimirCupomFiscal(doc: {
  state: string;
  environment: string;
  accessKey: string | null;
  danfe: string | null;
}) {
  return (
    doc.state === "authorized" &&
    ["homologacao", "producao"].includes(doc.environment) &&
    /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(doc.accessKey ?? "") &&
    Boolean(doc.danfe)
  );
}
