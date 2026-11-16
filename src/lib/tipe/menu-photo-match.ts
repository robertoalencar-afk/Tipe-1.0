type PhotoItem = { id: string; name: string; code?: string };
/** Exact codes only: never guess an item from a similar dish name. */
export function matchMenuPhotos(files: { name: string }[], items: PhotoItem[]) {
  const codes = files.map((f) => f.name.replace(/\.[^.]+$/, "").toUpperCase());
  return files.map((file, index) => {
    const code = codes[index]!;
    const matches = items.filter((i) => i.code?.toUpperCase() === code);
    const item =
      matches.length === 1 && codes.filter((c) => c === code).length === 1 ? matches[0] : undefined;
    return { file, item };
  });
}
