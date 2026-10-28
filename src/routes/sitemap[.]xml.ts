import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://tipe.digital";
// Páginas públicas e indexáveis. Áreas privadas, mesas, login e rotas técnicas ficam de fora.
const PATHS = ["/", "/simulador", "/teste-gratis", "/precos", "/integracoes", "/produtos/pay", "/produtos/order", "/produtos/staff", "/produtos/kitchen", "/produtos/restaurant", "/produtos/ai", "/produtos/guest", "/restaurante-fundador", "/legal", "/legal/termos-de-uso", "/legal/parceiros", "/legal/privacidade", "/legal/cookies", "/legal/inteligencia-artificial", "/legal/seus-direitos", "/legal/glossario", "/legal/versoes"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PATHS.map((p) => `<url><loc>${new URL(p, BASE_URL).href}</loc></url>`).join("");
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
