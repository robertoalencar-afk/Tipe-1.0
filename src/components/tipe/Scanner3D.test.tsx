import { expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (f: unknown) => f,
  createServerFn: () => ({}),
}));
vi.mock("@/lib/tipe/scanner3d.functions", () => ({
  MIN_FOTOS: 20,
  MAX_FOTOS: 150,
  listarScans: vi.fn(),
  iniciarScan: vi.fn(),
  concluirEnvioScan: vi.fn(),
  publicarScan: vi.fn(),
  descartarScan: vi.fn(),
}));
const { Scanner3D } = await import("./Scanner3D");

it("mostra as instruções e os escaneamentos com o status", () => {
  const qc = new QueryClient();
  qc.setQueryData(
    ["scanner-3d", "bistro"],
    [
      {
        id: "s1",
        itemId: "a",
        status: "pronto",
        fotos: 58,
        modelUrl: "https://x/a.glb",
        posterUrl: null,
        detalhe: null,
        criadoEm: "2026-11-17T20:00:00Z",
        processadoEm: null,
      },
      {
        id: "s2",
        itemId: "b",
        status: "erro",
        fotos: 40,
        modelUrl: null,
        posterUrl: null,
        detalhe: "só 10 de 40 fotos se encaixaram",
        criadoEm: "2026-11-17T19:00:00Z",
        processadoEm: null,
      },
    ],
  );
  const html = renderToString(
    <QueryClientProvider client={qc}>
      <Scanner3D
        slug="bistro"
        items={[
          { id: "a", name: "Baião de dois" },
          { id: "b", name: "Moqueca" },
        ]}
      />
    </QueryClientProvider>,
  );
  expect(html).toContain("Scanner 3D");
  expect(html).toContain("Escanear agora");
  expect(html).toContain("Enviar vídeo");
  expect(html).toContain("Pronto para revisar");
  expect(html).toContain("Publicar no cardápio");
  expect(html).toContain("Ver o 3D");
  expect(html).toContain("Não deu certo");
  expect(html).toContain("só 10 de 40 fotos se encaixaram");
});
