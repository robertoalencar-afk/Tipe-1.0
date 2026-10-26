// Renderiza "A lebre e a tartaruga" quadro a quadro (Playwright) e codifica com ffmpeg.
// Uso:
//   python3 plates.py W && python3 build.py W      (W = pasta de trabalho, ex.: /tmp/lebre)
//   node render.mjs W                               -> W/out/{lebre-tartaruga-16x9,-4x5}.{mp4,webm}, poster-*.webp
//   node render.mjs W 16x9 1.2,5.05                 -> só alguns quadros de prova em W/probe-16x9/
// Depois copie os arquivos de W/out para src/assets/video/.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const [,, W, onlyAr, onlyTimes] = process.argv;
const FPS = 30;
const POSTER_T = 5.3; // a lebre com o celular, título completo
const html = 'file://' + path.join(W, 'animacao.html');
const out = path.join(W, 'out');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function capture(ar) {
  const [w, h] = ar === '4x5' ? [1080, 1350] : [1600, 900];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  page.on('console', m => m.type() === 'error' && console.error('console:', m.text()));
  await page.goto(html + '?ar=' + ar);
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DUR);
  const times = onlyTimes ? onlyTimes.split(',').map(Number) : [...Array(Math.round(dur * FPS)).keys()].map(i => i / FPS);
  const dir = path.join(W, (onlyTimes ? 'probe-' : 'fr-') + ar);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.render(t), times[i]);
    await page.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: w, height: h } });
  }
  if (!onlyTimes) {
    await page.evaluate(t => window.render(t), POSTER_T);
    await page.screenshot({ path: `${dir}/poster.png`, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await page.close();
  return dir;
}
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
for (const ar of onlyAr ? [onlyAr] : ['16x9', '4x5']) {
  const dir = await capture(ar);
  console.log(ar, 'quadros em', dir);
  if (onlyTimes) continue;
  const name = `lebre-tartaruga-${ar}`;
  const scale = ar === '4x5' ? ['-vf', 'scale=864:1080:flags=lanczos'] : [];
  const inp = ['-framerate', String(FPS), '-i', `${dir}/f%04d.png`, ...scale];
  ff(...inp, '-c:v', 'libx264', '-preset', 'veryslow', '-crf', process.env.CRF264 || '23', '-pix_fmt', 'yuv420p', '-tune', 'animation', '-movflags', '+faststart', '-an', path.join(out, name + '.mp4'));
  ff(...inp, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', process.env.CRF9 || '34', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-pix_fmt', 'yuv420p', '-an', path.join(out, name + '.webm'));
  ff('-i', `${dir}/poster.png`, ...scale, '-c:v', 'libwebp', '-quality', '80', path.join(out, `poster-${ar}.webp`));
  for (const f of [name + '.mp4', name + '.webm', `poster-${ar}.webp`]) console.log(f, (fs.statSync(path.join(out, f)).size / 1024).toFixed(0), 'KB');
}
await browser.close();
