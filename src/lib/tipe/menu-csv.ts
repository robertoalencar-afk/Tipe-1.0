import { z } from "zod";

export const MenuImportRow = z.object({
  category: z.string().trim().min(2).max(60),
  code: z
    .string()
    .trim()
    .min(1)
    .max(16)
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(80),
  price: z.number().finite().min(0).max(10000),
  available: z.boolean(),
});
export const MenuImportRows = z
  .array(MenuImportRow)
  .min(1)
  .max(500)
  .superRefine((rows, ctx) => {
    const codes = new Set<string>();
    rows.forEach((row, i) => {
      if (codes.has(row.code))
        ctx.addIssue({
          code: "custom",
          path: [i, "code"],
          message: `Código repetido: ${row.code}`,
        });
      codes.add(row.code);
    });
  });
export type MenuRow = z.infer<typeof MenuImportRow>;

/** CSV com aspas, aspas escapadas e quebras de linha dentro de campos. */
export function parseMenuCsv(text: string): MenuRow[] {
  if (text.length > 1_000_000) throw new Error("Use um CSV de até 1 MB e 500 itens");
  text = text.replace(/^\uFEFF/, "");
  let quotedHeader = false,
    semicolons = 0,
    commas = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quotedHeader && text[i + 1] === '"') i++;
      else quotedHeader = !quotedHeader;
    } else if (!quotedHeader) {
      if (c === "\n" || c === "\r") break;
      if (c === ";") semicolons++;
      if (c === ",") commas++;
    }
  }
  const sep = semicolons > commas ? ";" : ",";
  const records: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || !field.trim()) quoted = !quoted;
      else throw new Error("Aspas inválidas no CSV");
    } else if (!quoted && (c === sep || c === "\n" || c === "\r")) {
      row.push(field.trim());
      field = "";
      if (c !== sep) {
        if (row.some(Boolean)) records.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else field += c;
  }
  if (quoted) throw new Error("Feche as aspas no CSV");
  row.push(field.trim());
  if (row.some(Boolean)) records.push(row);
  if (/^(categoria|category)$/i.test(records[0]?.[0] ?? "")) records.shift();
  const rows = records.map((cols, i) => {
    if (cols.length < 4 || cols.length > 5)
      throw new Error(`Registro ${i + 1}: use categoria, código, item, preço e ativo`);
    const [category, code, name, raw = "", active = "sim"] = cols;
    const priceText = raw.replace(/^R\$\s*/, "").trim();
    if (
      !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(priceText) &&
      !/^\d+(?:\.\d{1,2})?$/.test(priceText)
    )
      throw new Error(`Registro ${i + 1}: preço inválido`);
    const price = Number(
      priceText.includes(",") || /^\d{1,3}(?:\.\d{3})+$/.test(priceText)
        ? priceText.replace(/\./g, "").replace(",", ".")
        : priceText,
    );
    if (!/^(sim|s|true|1|ativo|não|nao|n|false|0|inativo)$/i.test(active))
      throw new Error(`Registro ${i + 1}: ativo deve ser sim ou não`);
    return { category, code, name, price, available: /^(sim|s|true|1|ativo)$/i.test(active) };
  });
  const result = MenuImportRows.safeParse(rows);
  if (!result.success)
    throw new Error(`Confira os dados do CSV: ${result.error.issues[0]?.message}`);
  return result.data;
}
