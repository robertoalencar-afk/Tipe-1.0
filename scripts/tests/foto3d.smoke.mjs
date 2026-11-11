// Regressão WebGL/CORS: componente real, duas origens locais, imagens do repositório.
// PW=/caminho/playwright CHROME_EXECUTABLE=/caminho/chrome node scripts/tests/foto3d.smoke.mjs
import { createRequire } from "node:module";
import { createServer as createHttpServer } from "node:http";
import { mkdtemp, readFile, writeFile, rm, symlink, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)(process.env.PW || "playwright");
const root = process.cwd();
const temp = await mkdtemp(join(tmpdir(), "tipe-foto3d-"));
const photo = await readFile("public/cardapio/baiao-1080.webp");
const depth = await readFile("public/cardapio/baiao-depth.png");
const assets = createHttpServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/foto") {
    res.setHeader("Content-Type", "image/webp");
    res.end(photo);
  } else if (req.url === "/mapa") {
    res.setHeader("Content-Type", "image/png");
    res.end(depth);
  } else {
    res.statusCode = 404;
    res.end();
  }
});
let app, browser;
try {
  await new Promise((ok) => assets.listen(0, "127.0.0.1", ok));
  const origin = `http://127.0.0.1:${assets.address().port}`;
  await symlink(resolve("node_modules"), join(temp, "node_modules"));
  await writeFile(
    join(temp, "index.html"),
    '<html><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
  );
  await writeFile(
    join(temp, "main.tsx"),
    `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {Foto3D} from ${JSON.stringify(`${root}/src/components/tipe/site/order/Foto3D.tsx`)};
    const bad=new URLSearchParams(location.search).has('bad');
    createRoot(document.getElementById('root')!).render(<div style={{position:'relative',width:390,height:500}}><Foto3D foto="${origin}/foto" profundidade={bad?'${origin}/ausente':'${origin}/mapa'} alt="Prato de teste" /></div>);
  `,
  );
  app = await createServer({
    configFile: false,
    root: temp,
    cacheDir: join(temp, "cache"),
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [root, temp, await realpath("node_modules")] },
    },
  });
  await app.listen();
  const url = app.resolvedUrls.local[0];
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
    args: ["--enable-unsafe-swiftshader"],
  });
  for (const scenario of ["webgl", "reduced", "no-webgl", "failed-map"]) {
    const ctx = await browser.newContext({
      reducedMotion: scenario === "reduced" ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();
    if (scenario === "no-webgl")
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (type === "webgl") return null;
          return original.call(this, type, ...args);
        };
      });
    await page.goto(url + (scenario === "failed-map" ? "?bad" : ""), {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForFunction(() => document.querySelector("img")?.naturalWidth > 0);
    if (scenario === "webgl") {
      await page.waitForFunction(() => document.querySelector("canvas")?.style.opacity === "1");
      assert.equal(
        await page.locator("canvas").evaluate((cv) => cv.getContext("webgl").getError()),
        0,
      );
    } else if (scenario === "reduced") assert.equal(await page.locator("canvas").count(), 0);
    else {
      assert.equal(await page.locator("img").evaluate((im) => im.style.opacity), "1");
      assert.equal(await page.locator("canvas").evaluate((cv) => cv.style.opacity), "0");
    }
    console.log(`PASS Foto3D: ${scenario}`);
    await ctx.close();
  }
} finally {
  await browser?.close();
  await app?.close();
  await new Promise((ok) => assets.close(ok));
  await rm(temp, { recursive: true, force: true });
}
