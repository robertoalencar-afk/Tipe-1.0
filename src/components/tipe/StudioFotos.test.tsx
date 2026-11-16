import { expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
vi.mock("./site/order/CriarPratoDemo", () => ({
  DICAS: [{ titulo: "Luz de janela", texto: "Luz natural de lado." }],
  CriarPratoDemo: () => null,
}));
const { StudioFotos } = await import("./StudioFotos");
it("mostra progresso de fotos e leva aos pratos sem foto", () => {
  const html = renderToString(<StudioFotos ir={() => {}} total={33} comFoto={9} />);
  expect(html).toContain("9 de 33 pratos com foto");
  expect(html).toContain("Fotografar 24 prato(s) sem foto");
  expect(html).toContain("Luz de janela");
});
