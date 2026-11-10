import { Fragment, type ReactNode } from "react";

/**
 * Markdown mínimo para as respostas da Lebre: parágrafos, listas, **negrito**, *itálico*,
 * [links](url) e caminhos do site (/cadastro, /precos) viram links. Substitui o
 * renderizador completo (≈1 MB com código, fórmulas e CJK), que a Lebre nunca usa.
 * Monta elementos React, sem HTML cru, então nada do texto vira código na página.
 */

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|(?<![\w/.])(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)(?![\w/])/gi;

function linkProps(href: string) {
  return href.startsWith("/")
    ? { href }
    : { href, target: "_blank", rel: "noopener noreferrer" };
}

const LINK = "font-medium text-brand-strong underline decoration-primary/50 underline-offset-2 hover:decoration-primary";

export function inline(texto: string, chave = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let ultimo = 0;
  let n = 0;
  for (const m of texto.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > ultimo) out.push(texto.slice(ultimo, i));
    const k = `${chave}-${n++}`;
    if (m[1] !== undefined) out.push(<strong key={k} className="font-semibold text-foreground">{inline(m[1], k)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{inline(m[2], k)}</em>);
    else if (m[3] !== undefined && m[4]) out.push(<a key={k} className={LINK} {...linkProps(m[4])}>{m[3]}</a>);
    else if (m[5]) out.push(<a key={k} className={LINK} href={m[5]}>{m[5]}</a>);
    ultimo = i + m[0].length;
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return out;
}

type Bloco = { tipo: "p"; linhas: string[] } | { tipo: "ul" | "ol"; itens: string[] };

export function blocos(texto: string): Bloco[] {
  const out: Bloco[] = [];
  for (const linha of texto.replace(/\r/g, "").split("\n")) {
    const l = linha.trim();
    const ul = /^[-*•]\s+(.*)$/.exec(l);
    const ol = /^\d+[.)]\s+(.*)$/.exec(l);
    const atual = out[out.length - 1];
    if (!l) {
      out.push({ tipo: "p", linhas: [] });
    } else if (ul || ol) {
      const tipo = ul ? "ul" : "ol";
      const item = (ul ?? ol)![1]!;
      if (atual?.tipo === tipo) atual.itens.push(item);
      else out.push({ tipo, itens: [item] });
    } else if (atual?.tipo === "p") {
      atual.linhas.push(l.replace(/^#{1,6}\s+/, ""));
    } else {
      out.push({ tipo: "p", linhas: [l.replace(/^#{1,6}\s+/, "")] });
    }
  }
  return out.filter((b) => (b.tipo === "p" ? b.linhas.length > 0 : b.itens.length > 0));
}

export function LebreTexto({ children }: { children: string }) {
  return (
    <div className="space-y-2.5 text-[0.95rem] leading-relaxed">
      {blocos(children).map((b, i) =>
        b.tipo === "p" ? (
          <p key={i}>
            {b.linhas.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        ) : b.tipo === "ul" ? (
          <ul key={i} className="space-y-1.5">
            {b.itens.map((t, j) => (
              <li key={j} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary">
                {inline(t, `${i}-${j}`)}
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-brand-strong">
            {b.itens.map((t, j) => (
              <li key={j}>{inline(t, `${i}-${j}`)}</li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}
