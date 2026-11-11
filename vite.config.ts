import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Build próprio (sem Lovable): SSR do TanStack Start empacotado pelo Nitro como
// Cloudflare Worker. NITRO_PRESET=node-server gera um servidor Node para testes locais.
export default defineConfig(({ command, mode }) => {
  // VITE_* do .env (ou do ambiente do CI) ficam disponíveis no cliente e no SSR.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define = Object.fromEntries(Object.entries(env).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]));
  return {
    define,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    server: { host: "::", port: 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: { behavior: "error", client: { files: ["**/server/**"], specifiers: ["server-only"] } },
        // Redireciona a entrada do servidor para src/server.ts (wrapper de erro do SSR).
        server: { entry: "server" },
      }),
      ...(command === "build"
        ? [nitro({ preset: process.env["NITRO_PRESET"] || "cloudflare-module", cloudflare: { nodeCompat: true, deployConfig: true } })]
        : []),
      viteReact(),
    ],
  };
});
