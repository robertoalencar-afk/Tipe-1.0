import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logo from "@/assets/marca/tipe-logo.svg";

export type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[]; extra?: ReactNode };

export function LegalPage({ title, version, effective, intro, sections, children }: { title: string; version: string; effective: string; intro?: string; sections: LegalSection[]; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">← Voltar para a página inicial</Link>
        <article className="mt-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-10">
          <img src={logo} alt="TIPE" className="h-10 w-auto object-contain sm:h-12" />
          <h1 className="mt-6 font-display text-2xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Versão {version} · vigente desde {effective}</p>
          {intro && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{intro}</p>}
          <div className="mt-8 space-y-8">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="font-display text-lg font-semibold sm:text-xl">{s.title}</h2>
                {s.paragraphs?.map((p) => <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-foreground/90">{p}</p>)}
                {s.bullets && (
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">
                    {s.bullets.map((b) => (
                      <li key={b.slice(0, 40)} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden /><span>{b}</span></li>
                    ))}
                  </ul>
                )}
                {s.extra}
              </section>
            ))}
          </div>
          {children}
          <nav aria-label="Documentos legais" className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm">
            <Link to="/legal" className="text-muted-foreground underline hover:text-foreground">Central Jurídica (versão vigente)</Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
