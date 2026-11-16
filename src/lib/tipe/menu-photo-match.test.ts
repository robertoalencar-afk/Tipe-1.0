import { describe, expect, it } from "vitest";
import { matchMenuPhotos } from "./menu-photo-match";
const items = [
  { id: "1", name: "Batata frita", code: "A-1" },
  { id: "2", name: "Batata frita", code: "B-2" },
];
describe("associação de fotos por código", () => {
  it("distinguishes identically named dishes by the exact item code", () => {
    expect(matchMenuPhotos([{ name: "b-2.JPG" }], items)[0]?.item?.id).toBe("2");
  });
  it.each(["Batata frita.jpg", "A-1-extra.jpg", "A-1.jpg.exe", "../A-1.jpg"])(
    "does not guess from names or partial codes: %s",
    (name) => {
      expect(matchMenuPhotos([{ name }], items)[0]?.item).toBeUndefined();
    },
  );
  it("rejects duplicate files and ambiguous item codes before any upload", () => {
    expect(
      matchMenuPhotos([{ name: "A-1.jpg" }, { name: "a-1.png" }], items).every((r) => !r.item),
    ).toBe(true);
    expect(
      matchMenuPhotos([{ name: "A-1.jpg" }], [...items, { id: "3", name: "Outro", code: "A-1" }])[0]
        ?.item,
    ).toBeUndefined();
  });
});
