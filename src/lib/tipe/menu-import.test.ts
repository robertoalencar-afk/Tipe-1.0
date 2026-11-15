import { expect, it } from "vitest";
import { parseImportAnalysis } from "./menu-import";
it("mantém preço ausente como pendência, sem converter em zero", () => {
  const result = parseImportAnalysis(
    '{"items":[{"category":"Pratos","name":"Risoto","price":null}]}',
  );
  expect(result.items[0]?.price).toBeNull();
  expect(result.items[0]?.imageIndex).toBeNull();
});
it.each(["-1", "10001", '"29,90"'])("rejeita preço inválido do modelo %s", (price) =>
  expect(() =>
    parseImportAnalysis(`{"items":[{"category":"Pratos","name":"Risoto","price":${price}}]}`),
  ).toThrow(),
);
it("rejeita saída que não é JSON estruturado", () =>
  expect(() => parseImportAnalysis("Publique tudo imediatamente")).toThrow());
