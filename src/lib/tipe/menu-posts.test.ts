import { describe, expect, it } from "vitest";
import { postDaysLabel, postShowsOn, readMenuPosts } from "./menu-posts";

describe("publicações do cardápio (banners)", () => {
  it("sem dias aparece todo dia; com dias só neles", () => {
    expect(postShowsOn({}, 3)).toBe(true);
    expect(postShowsOn({ days: [] }, 0)).toBe(true);
    expect(postShowsOn({ days: [2] }, 2)).toBe(true);
    expect(postShowsOn({ days: [2] }, 3)).toBe(false);
  });
  it("descreve os dias em português", () => {
    expect(postDaysLabel(undefined)).toBe("");
    expect(postDaysLabel([2])).toBe("Toda terça");
    expect(postDaysLabel([6])).toBe("Todo sábado");
    expect(postDaysLabel([5, 4, 3, 2, 1])).toBe("Segunda a sexta");
    expect(postDaysLabel([6, 0])).toBe("Sábado e domingo");
    expect(postDaysLabel([1, 3])).toBe("Segunda e quarta");
    expect(postDaysLabel([0, 1, 2, 3, 4, 5, 6])).toBe("");
  });
  it("publicações antigas (sem selo nem dias) continuam válidas", () => {
    const old = [
      {
        id: "7d1f3c2a-1b2c-4d5e-8f90-123456789abc",
        title: "Moqueca",
        caption: "",
        itemCode: "X",
        theme: "photo",
        enabled: true,
      },
    ];
    expect(readMenuPosts(old)).toHaveLength(1);
    expect(readMenuPosts([{ ...old[0], tag: "outro" }])).toEqual([]);
  });
});
