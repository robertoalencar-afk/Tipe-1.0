import { afterEach, describe, expect, it, vi } from "vitest";
import {
  matchOriginalPhoto,
  multiplyPhotoMatrix,
  photoHasStoryResolution,
  photoPlacement,
  decodedMenuPhoto,
} from "./menu-photo-source";

afterEach(() => vi.useRealTimers());
it("waits for a JPEG referenced before decoding instead of silently dropping it", async () => {
  vi.useFakeTimers();
  const image = { width: 1200, height: 900 };
  const task = decodedMenuPhoto(
    { has: () => false, get: (_id, callback) => setTimeout(() => callback?.(image), 20) },
    "dish",
  );
  await vi.advanceTimersByTimeAsync(20);
  await expect(task).resolves.toBe(image);
});
it("allows the menu review to continue if a damaged PDF image never arrives", async () => {
  vi.useFakeTimers();
  const task = decodedMenuPhoto({ has: () => false, get: () => undefined }, "broken-image");
  await vi.advanceTimersByTimeAsync(5000);
  await expect(task).resolves.toBeNull();
});

describe("fotografias originais do cardápio", () => {
  it("uses the image placement in PDF coordinates, including nested transforms", () => {
    const viewport: [number, number, number, number, number, number] = [1, 0, 0, -1, 0, 800];
    const m = multiplyPhotoMatrix(viewport, [300, 0, 0, 400, 100, 200]);
    expect(photoPlacement(m, 600, 800)).toEqual({ x: 1 / 6, y: 0.25, width: 0.5, height: 0.5 });
  });
  it("leaves rotated and mirrored photos for review", () => {
    expect(photoPlacement([0, 200, 300, 0, 0, 0], 600, 800)).toBeNull();
    expect(photoPlacement([-300, 0, 0, -400, 300, 600], 600, 800)).toBeNull();
  });
  it("matches and crops original pixels rather than a rendered page screenshot", () => {
    const match = matchOriginalPhoto(
      [
        {
          pageIndex: 0,
          width: 1600,
          height: 2000,
          bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
        },
      ],
      0,
      { x: 0.125, y: 0.125, width: 0.45, height: 0.45 },
    );
    expect(match?.index).toBe(0);
    expect(match?.crop.width).toBeCloseTo(0.9);
    expect(match?.crop.height).toBeCloseTo(0.9);
  });
  it("does not confuse a scanned full page with an individual dish", () => {
    expect(
      matchOriginalPhoto(
        [{ pageIndex: 0, width: 2000, height: 3000, bounds: { x: 0, y: 0, width: 1, height: 1 } }],
        0,
        { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
      ),
    ).toBeNull();
  });
  it("does not match another page or guess overlapping assets", () => {
    const photo = {
      pageIndex: 1,
      width: 1600,
      height: 2000,
      bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
    };
    expect(matchOriginalPhoto([photo], 0, photo.bounds)).toBeNull();
    expect(matchOriginalPhoto([photo, photo], 1, photo.bounds)).toBeNull();
  });
  it("rejects tiny source crops and accepts sharp horizontal or vertical originals", () => {
    expect(photoHasStoryResolution(266, 177)).toBe(false);
    expect(photoHasStoryResolution(356, 533)).toBe(false);
    expect(photoHasStoryResolution(1200, 900)).toBe(true);
    expect(photoHasStoryResolution(900, 1600)).toBe(true);
    expect(photoHasStoryResolution(900, NaN)).toBe(false);
  });
});
