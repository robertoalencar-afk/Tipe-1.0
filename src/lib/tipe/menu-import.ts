import { z } from "zod";
export const ImportedDish = z.object({
  category: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(200).default(""),
  price: z.number().finite().min(0).max(10000).nullable(),
  photoBounds: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0.02).max(1),
      height: z.number().min(0.02).max(1),
    })
    .refine((b) => b.x + b.width <= 1.01 && b.y + b.height <= 1.01)
    .nullable()
    .default(null),
  imageIndex: z.number().int().min(0).max(59).nullable().default(null),
});
export type ImportedDish = z.infer<typeof ImportedDish>;
export const ImportAnalysis = z.object({
  items: z.array(ImportedDish).max(200),
  warnings: z.array(z.string().max(250)).max(12).default([]),
});
export function parseImportAnalysis(text: string) {
  return ImportAnalysis.parse(
    JSON.parse(text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")),
  );
}
export type ImportPhoto = {
  name: string;
  url: string;
  width?: number;
  height?: number;
  pageIndex?: number;
  bounds?: import("./menu-photo-source").PhotoBounds;
};
export type ImportPage = { text: string; image?: string };
export type ImportSource = { pages: ImportPage[]; photos: ImportPhoto[]; warnings: string[] };
export const MAX_IMPORT_BYTES = 8_000_000;
