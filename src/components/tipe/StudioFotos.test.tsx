import { expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
vi.mock("./site/order/CriarPratoDemo", () => ({
  DICAS: [{ titulo: "Luz de janela", texto: "Luz natural de lado." }],
  CriarPratoDemo: () => null,
}));
const { StudioFotos } = await import("./StudioFotos");
const item = (id: string, name: string) => ({
  id,
  name,
  price: 42,
  category_id: "c1",
  available: true,
});
it("lista os pratos sem foto e os prontos no painel", () => {
  const html = renderToString(
    <StudioFotos
      ir={() => {}}
      onFotografar={() => {}}
      categories={[{ id: "c1", name: "Principais" }]}
      items={[item("a", "Baião de dois"), item("b", "Moqueca"), item("c", "Pudim")]}
      midia={{
        a: { foto: "/a.webp", profundidade: "/a.png" },
        b: { foto: null, profundidade: null },
        c: { foto: "/c.webp", profundidade: null },
      }}
    />,
  );
  expect(html).toContain("1 de 3 pratos prontos para os stories");
  expect(html).toContain("Moqueca");
  expect(html).toContain("Sem foto");
  expect(html).toContain("Sem volume 3D");
  expect(html).not.toMatch(/Baião de dois<\/p>/);
  expect(html).toContain("Luz de janela");
});
