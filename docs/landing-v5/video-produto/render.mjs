// Renderiza produto-fluxo.html quadro a quadro (Playwright) e codifica com ffmpeg.
// Uso: node docs/landing-v5/video-produto/render.mjs [saida=/tmp/produto-fluxo] [fps=30] [tempos=1.2,3.4]
// Gera <saida>/frames/*.png, <saida>/produto-fluxo.{mp4,webm} e <saida>/produto-fluxo-poster.webp.
// Depois copie os três arquivos para src/assets/video/.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, "../../../src/assets/marca");
const [, , out = "/tmp/produto-fluxo", fps = "30", only] = process.argv;
// SPEED: acelera a linha do tempo inteira (26/10: 1,3× para movimentos mais rápidos, ~10 s).
const SPEED = Number(process.env.SPEED || 1.3);
const POSTER_T = 1.95; // totem com a moldura de leitura sobre o QR

// monta o HTML com os SVGs oficiais da marca embutidos (logo em navy monocromático sobre o turquesa)
const logo = fs
  .readFileSync(path.join(assets, "tipe-logo-branco.svg"), "utf8")
  .replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#021E34"')
  .replace(/role="img"[^>]*?aria-label="TIPE"/, 'aria-hidden="true"');
const simbolo = fs.readFileSync(path.join(assets, "tipe-simbolo.svg"), "utf8");
const built = path.join(here, ".produto-fluxo.build.html");
fs.writeFileSync(
  built,
  fs
    .readFileSync(path.join(here, "produto-fluxo.html"), "utf8")
    .replace("__LOGO__", logo)
    .replace("__SIMBOLO__", simbolo),
);

const frames = path.join(out, only ? "probe" : "frames");
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 1,
});
page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto("file://" + built);
await page.evaluate(() => window.ready);
const dur = await page.evaluate(() => window.DUR);
const times = only ? only.split(",").map(Number) : null;
const n = times ? times.length : Math.round((dur / SPEED) * Number(fps));
for (let i = 0; i < n; i++) {
  const t = times ? times[i] : (i / Number(fps)) * SPEED;
  await page.evaluate((t) => window.render(t), t);
  await page.screenshot({
    path: `${frames}/f${String(i).padStart(4, "0")}.png`,
    clip: { x: 0, y: 0, width: 1080, height: 1350 },
  });
}
if (!only) {
  await page.evaluate((t) => window.render(t), POSTER_T);
  await page.screenshot({
    path: path.join(out, "poster.png"),
    clip: { x: 0, y: 0, width: 1080, height: 1350 },
  });
}
await browser.close();
fs.rmSync(built);
console.log("quadros", n, "em", frames);
if (only) process.exit(0);

const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });
const inp = ["-framerate", fps, "-i", `${frames}/f%04d.png`];
const crf264 = process.env.CRF264 || "28",
  crf9 = process.env.CRF9 || "38";
ff(
  ...inp,
  "-c:v",
  "libx264",
  "-preset",
  "veryslow",
  "-crf",
  crf264,
  "-pix_fmt",
  "yuv420p",
  "-tune",
  "animation",
  "-movflags",
  "+faststart",
  "-an",
  path.join(out, "produto-fluxo.mp4"),
);
ff(
  ...inp,
  "-c:v",
  "libvpx-vp9",
  "-b:v",
  "0",
  "-crf",
  crf9,
  "-row-mt",
  "1",
  "-deadline",
  "good",
  "-cpu-used",
  "1",
  "-pix_fmt",
  "yuv420p",
  "-an",
  path.join(out, "produto-fluxo.webm"),
);
ff(
  "-i",
  path.join(out, "poster.png"),
  "-c:v",
  "libwebp",
  "-quality",
  "82",
  path.join(out, "produto-fluxo-poster.webp"),
);
for (const f of ["produto-fluxo.mp4", "produto-fluxo.webm", "produto-fluxo-poster.webp"])
  console.log(f, (fs.statSync(path.join(out, f)).size / 1024).toFixed(0), "KB");
