import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [html, out, fps='30', dur='20'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto('file://' + html, { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 1500));
const n = Math.round(+dur * +fps);
const res = await p.evaluate(([n, fps]) => {
  const tl = window.__timelines['lebre'];
  const partes = [...document.querySelectorAll('.parte')].map(e => e.id);
  const peles = [...document.querySelectorAll('[id$="-pele"]')].map(e => e.id);
  const arcos = [...document.querySelectorAll('svg.arco')].map(e => e.id);
  const fr = [];
  for (let i = 0; i < n; i++) {
    tl.seek(i / fps, false);
    const f = {};
    for (const id of partes) { const g = gsap.getProperty('#' + id); f[id] = [g('rotation'), g('x'), g('y'), g('scaleX'), g('scaleY'), g('opacity')]; }
    for (const id of peles) f[id] = gsap.getProperty('#' + id, 'y');
    for (const id of arcos) f[id] = +getComputedStyle(document.getElementById(id)).opacity;
    fr.push(f);
  }
  return { fps, partes, peles, arcos, fr };
}, [n, +fps]);
fs.writeFileSync(out, JSON.stringify(res));
console.log('frames', res.fr.length, res.partes.length, res.peles.length, res.arcos.length);
await b.close();
