import { expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
vi.mock("./site/order/Foto3D", () => ({ Foto3D: () => null }));
const { StudioFotos } = await import("./StudioFotos");
const item = (id: string, name: string, model_url: string | null = null) => ({
  id,
  name,
  price: 42,
  category_id: "c1",
  available: true,
  model_url,
});
it("mostra as três etapas, as trilhas e a fila de pratos pendentes", () => {
  const html = renderToString(
    <StudioFotos
      ir={() => {}}
      onFotografar={() => {}}
      categories={[{ id: "c1", name: "Principais" }]}
      items={[item("a", "Baião de dois", "/a.glb"), item("b", "Moqueca"), item("c", "Pudim")]}
      midia={{
        a: { foto: "/a.webp", profundidade: "/a.png" },
        b: { foto: null, profundidade: null },
        c: { foto: "/c.webp", profundidade: null },
      }}
    />,
  );
  expect(html).toContain("Modelo 3D");
  expect(html).toContain("Foto do prato");
  expect(html).toContain("Vídeo 3D");
  expect(html).toContain("Monte a cena");
  expect(html).toContain("Moqueca");
  expect(html).toContain("Sem foto");
  expect(html).toContain("Sem volume");
  expect(html).not.toMatch(/Baião de dois<\/p>/);
  expect(html).toContain("Ensaio antes de publicar");
});
