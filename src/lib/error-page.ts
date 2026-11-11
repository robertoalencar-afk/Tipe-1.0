// Página de erro estática (sem React), usada quando o servidor falha antes de renderizar.
// public/offline.html é a versão "sem internet" salva em arquivo (o service worker a serve offline);
// o teste error-page.test.ts garante que o arquivo e o código não se separem.

type Opcoes = { codigo: string; titulo: string; texto: string; recarregar: boolean };

const ESTILO = `
  :root { --bg:#ffffff; --fg:#021e34; --muted:#5b6675; --line:#e5e8ec; --brand:#0fc9bd; --brand-strong:#00796d; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0b1420; --fg:#f2f5f8; --muted:#a3adb9; --line:#223042; --brand-strong:#4fe0d3; } .logo { filter: brightness(0) invert(1); } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; flex-direction:column; background:var(--bg); color:var(--fg); font: 16px/1.5 "Inter Tight", system-ui, -apple-system, "Segoe UI", sans-serif; padding: 0 16px; }
  header { max-width: 64rem; width:100%; margin: 0 auto; padding: 24px 0; }
  .logo { height: 32px; width: auto; }
  main { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; max-width: 28rem; margin: 0 auto; padding-bottom: 64px; }
  .lebre { width: 128px; height: 128px; object-fit: contain; }
  .codigo { margin: 24px 0 0; font: 500 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--brand-strong); }
  h1 { margin: 8px 0 0; font-size: 1.6rem; line-height: 1.2; letter-spacing: -0.01em; }
  p.texto { margin: 12px 0 0; color: var(--muted); }
  .acoes { margin-top: 32px; display:flex; gap: 8px; flex-wrap: wrap; justify-content:center; }
  .btn { display:inline-flex; align-items:center; justify-content:center; height:44px; padding: 0 24px; border-radius: 999px; font: 600 14px/1 inherit; font-family: inherit; text-decoration:none; cursor:pointer; border:1px solid var(--line); background: var(--bg); color: var(--fg); }
  .btn.primario { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  .btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  .ajuda { margin-top: 40px; font-size: 14px; color: var(--muted); }
  .ajuda a { color: inherit; }
`;

function pagina(o: Opcoes): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${o.titulo} | Tipe</title>
    <link rel="icon" href="/favicon.png?v=3" type="image/png" />
    <style>${ESTILO}</style>
  </head>
  <body>
    <header><a href="/" aria-label="Página inicial da Tipe"><img class="logo" src="/marca/tipe-logo.svg" alt="Tipe" width="105" height="32" /></a></header>
    <main>
      <img class="lebre" src="/marca/lebre-esperando.webp" alt="" width="128" height="128" />
      <p class="codigo">${o.codigo}</p>
      <h1>${o.titulo}</h1>
      <p class="texto">${o.texto}</p>
      <div class="acoes">
        ${o.recarregar ? '<button class="btn primario" type="button" onclick="location.reload()">Tentar de novo</button>' : ""}
        <a class="btn${o.recarregar ? "" : " primario"}" href="/">Ir para a página inicial</a>
      </div>
      <p class="ajuda">Precisa de ajuda? Veja a <a href="/ajuda">Central de ajuda</a>.</p>
    </main>
  </body>
</html>`;
}

export function renderErrorPage(): string {
  return pagina({
    codigo: "Erro 500",
    titulo: "Esta página não carregou",
    texto: "Algo deu errado do nosso lado, não do seu. Tente de novo em instantes. Se você estava pagando, nada é cobrado duas vezes.",
    recarregar: true,
  });
}

export function renderOfflinePage(): string {
  return pagina({
    codigo: "Sem internet",
    titulo: "Você está sem internet",
    texto: "Confira o Wi-Fi ou os dados móveis e tente de novo. Nenhum pagamento é feito sem confirmação.",
    recarregar: true,
  });
}
