/**
 * Prepara o HTML de um e-mail recebido para leitura na Central (só no navegador: usa DOMParser).
 * Defesa em camadas: (1) limpeza aqui, (2) iframe sandbox sem scripts, (3) CSP própria no documento.
 * Também deixa o e-mail legível no celular: imagens e tabelas cabem na largura da tela.
 */
const PROIBIDAS =
  "script,noscript,iframe,frame,frameset,object,embed,applet,form,input,button,select,textarea,link,meta,base,title,audio,video,source,track,portal,template,svg script";
const URL_ATTRS = [
  "href",
  "src",
  "background",
  "poster",
  "action",
  "formaction",
  "xlink:href",
  "srcset",
];

const CSP =
  "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:; script-src 'none'; form-action 'none'; base-uri 'none'";

const ESTILO = `
html,body{margin:0;padding:0;background:#fff;color:#111}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px;line-height:1.5;padding:2px;overflow-wrap:anywhere;word-break:break-word;-webkit-text-size-adjust:100%}
img{max-width:100%!important;height:auto!important}
table{max-width:100%!important}
pre{white-space:pre-wrap}
a{color:#1a56db}
.tipe-sem-imagem{display:inline-block;padding:4px 8px;border:1px dashed #c4c7cc;border-radius:6px;color:#575b5f;font-size:12px}
`;

const LARGURA_FIXA = 300;

export type OpcoesEmailHtml = { imagensRemotas: boolean };
export type EmailHtml = { html: string; remotasBloqueadas: number };

function urlPerigosa(v: string) {
  const s = v.replace(/[\s\p{Cc}]/gu, "").toLowerCase();
  return (
    s.startsWith("javascript:") ||
    s.startsWith("vbscript:") ||
    (s.startsWith("data:") && !s.startsWith("data:image/"))
  );
}

export function prepararEmailHtml(bruto: string, { imagensRemotas }: OpcoesEmailHtml): EmailHtml {
  const doc = new DOMParser().parseFromString(bruto, "text/html");
  doc.querySelectorAll(PROIBIDAS).forEach((el) => el.remove());
  let remotasBloqueadas = 0;

  doc.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase();
      if (n.startsWith("on") || n === "srcdoc" || n === "formaction" || n === "ping")
        el.removeAttribute(a.name);
      else if (URL_ATTRS.includes(n) && urlPerigosa(a.value)) el.removeAttribute(a.name);
      else if (
        n === "style" &&
        /expression\s*\(|javascript:|behavior\s*:|-moz-binding/i.test(a.value)
      )
        el.removeAttribute(a.name);
    }
  });
  // CSS embutido não pode puxar scripts nem importar folhas externas.
  doc.querySelectorAll("style").forEach((s) => {
    s.textContent = (s.textContent ?? "")
      .replace(/@import[^;]+;?/gi, "")
      .replace(/expression\s*\(|javascript:|behavior\s*:|-moz-binding/gi, "");
  });

  // Layouts de largura fixa (tabelas de 600px) viram fluidos: cabem no celular sem encolher o texto.
  doc.querySelectorAll("table,td,th,div,center,tbody,tr").forEach((el) => {
    const w = Number.parseInt(el.getAttribute("width") ?? "", 10);
    if (w >= LARGURA_FIXA) {
      el.removeAttribute("width");
      if (el.tagName === "TABLE")
        el.setAttribute("style", `width:100%;max-width:${w}px;${el.getAttribute("style") ?? ""}`);
    }
    const st = el.getAttribute("style");
    if (st && /(?:min-)?width\s*:\s*\d{3,}px/i.test(st)) {
      el.setAttribute(
        "style",
        st
          .replace(/min-width\s*:\s*(\d{3,})px\s*(!important)?/gi, (m, n) =>
            Number(n) >= LARGURA_FIXA ? "min-width:0" : m,
          )
          .replace(/(^|[;\s])width\s*:\s*(\d{3,})px\s*(!important)?/gi, (m, pre, n) =>
            Number(n) >= LARGURA_FIXA ? `${pre}width:100%;max-width:${n}px` : m,
          ),
      );
    }
  });
  doc.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });

  doc.querySelectorAll("img").forEach((img) => {
    img.removeAttribute("srcset");
    const src = (img.getAttribute("src") ?? "").trim();
    if (/^cid:/i.test(src)) {
      // Imagem anexada que não coube na mensagem guardada.
      const ph = doc.createElement("span");
      ph.className = "tipe-sem-imagem";
      ph.textContent = img.getAttribute("alt") || "imagem anexada";
      img.replaceWith(ph);
      return;
    }
    if (/^http:\/\//i.test(src)) img.setAttribute("src", src.replace(/^http:/i, "https:"));
    if (/^https?:\/\//i.test(src) && !imagensRemotas) {
      img.setAttribute("data-src-bloqueada", img.getAttribute("src") ?? "");
      img.removeAttribute("src");
      remotasBloqueadas++;
    }
    img.setAttribute("loading", "lazy");
    img.setAttribute("referrerpolicy", "no-referrer");
  });
  // Fundos com http viram https (CSP só libera https e data).
  doc.querySelectorAll("[background]").forEach((el) => {
    const v = el.getAttribute("background") ?? "";
    if (!imagensRemotas && /^https?:/i.test(v)) {
      el.removeAttribute("background");
      remotasBloqueadas++;
    } else el.setAttribute("background", v.replace(/^http:/i, "https:"));
  });

  const head = `<meta charset="utf-8"><base target="_blank"><meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><style>${ESTILO}</style>`;
  const estilosOriginais = Array.from(doc.head?.querySelectorAll("style") ?? [])
    .map((s) => s.outerHTML)
    .join("");
  return {
    html: `<!doctype html><html><head>${head}${estilosOriginais}</head><body>${doc.body?.innerHTML ?? ""}</body></html>`,
    remotasBloqueadas,
  };
}
