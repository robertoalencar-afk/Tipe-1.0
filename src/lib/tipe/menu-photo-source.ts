export type PhotoBounds = { x: number; y: number; width: number; height: number };
export type PhotoMatrix = [number, number, number, number, number, number];

/** PDF.js may deliver an operator before the referenced JPEG has finished decoding. */
export async function decodedMenuPhoto(
  store: {
    has(id: string): boolean;
    get(id: string, callback?: (image: unknown) => void): unknown;
  },
  id: string,
): Promise<unknown> {
  if (store.has(id)) return store.get(id);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    try {
      store.get(id, (image) => {
        clearTimeout(timer);
        resolve(image);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

export function multiplyPhotoMatrix(a: PhotoMatrix, b: number[]): PhotoMatrix {
  return [
    a[0] * b[0]! + a[2] * b[1]!,
    a[1] * b[0]! + a[3] * b[1]!,
    a[0] * b[2]! + a[2] * b[3]!,
    a[1] * b[2]! + a[3] * b[3]!,
    a[0] * b[4]! + a[2] * b[5]! + a[4],
    a[1] * b[4]! + a[3] * b[5]! + a[5],
  ];
}

/** Only an unrotated image can be cropped without changing the dish's framing. */
export function photoPlacement(m: PhotoMatrix, width: number, height: number): PhotoBounds | null {
  if (Math.abs(m[1]) > 0.001 || Math.abs(m[2]) > 0.001 || m[0] <= 0 || m[3] >= 0) return null;
  return {
    x: m[4] / width,
    y: (m[5] + m[3]) / height,
    width: m[0] / width,
    height: -m[3] / height,
  };
}

/** A quality gate for automatic suggestions, not a claim that a photo is genuine. */
export function photoHasStoryResolution(width: number, height: number) {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    Math.min(width, height) >= 480 &&
    Math.max(width, height) >= 900
  );
}

export function matchOriginalPhoto(
  photos: { pageIndex?: number; bounds?: PhotoBounds; width?: number; height?: number }[],
  pageIndex: number,
  crop: PhotoBounds,
): { index: number; crop: PhotoBounds } | null {
  const matches = photos
    .flatMap((photo, index) => {
      const b = photo.bounds;
      if (
        photo.pageIndex !== pageIndex ||
        !b ||
        !photo.width ||
        !photo.height ||
        b.width <= 0 ||
        b.height <= 0
      )
        return [];
      const x = Math.max(crop.x, b.x),
        y = Math.max(crop.y, b.y);
      const w = Math.min(crop.x + crop.width, b.x + b.width) - x;
      const h = Math.min(crop.y + crop.height, b.y + b.height) - y;
      if (w <= 0 || h <= 0) return [];
      const intersection = w * h;
      const score = intersection / (crop.width * crop.height + b.width * b.height - intersection);
      if (score < 0.65) return [];
      const relative = {
        x: (x - b.x) / b.width,
        y: (y - b.y) / b.height,
        width: w / b.width,
        height: h / b.height,
      };
      if (!photoHasStoryResolution(photo.width * relative.width, photo.height * relative.height))
        return [];
      return [{ index, crop: relative, score }];
    })
    .sort((a, b) => b.score - a.score);
  // Overlapping embedded assets must be reviewed instead of guessed.
  if (!matches.length || (matches[1] && matches[0]!.score - matches[1].score < 0.1)) return null;
  return { index: matches[0]!.index, crop: matches[0]!.crop };
}
