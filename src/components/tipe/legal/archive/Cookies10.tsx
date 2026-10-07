import { LegalPage, type LegalSection } from "@/components/tipe/LegalPage";
import { PrivacyPreferences } from "@/components/tipe/PrivacyPreferences";


const ITENS = [
  ["sb-…-auth-token", "TIPE / provedor de autenticação", "Manter o login da área do restaurante", "localStorage", "Até sair ou a sessão expirar"],
  ["tipe:mesa:… (identificação)", "TIPE", "Lembrar seu nome na mesa para retomar a conta", "localStorage", "Até a mesa reabrir ou você limpar os dados"],
  ["tipe:cadastro-pendente", "TIPE", "Concluir o cadastro após confirmar o e-mail", "localStorage", "Até concluir o cadastro"],
  ["Estado do simulador", "TIPE", "Guardar a demonstração em /simulador", "localStorage", "Reinicia 2 min após encerrar"],
  ["tipe:privacy-consent", "TIPE", "Guardar suas preferências de privacidade", "localStorage", "Até você alterar ou limpar"],
  ["Login com Google", "Google", "Autenticar, somente se você escolher esse login", "Cookies do Google", "Definida pelo Google"],
];

const sections: LegalSection[] = [
  { title: "1. O que são cookies", paragraphs: ["Cookies e tecnologias semelhantes (como o localStorage do navegador) guardam pequenas informações no seu aparelho para que um site funcione ou lembre escolhas."] },
  { title: "2. O que o TIPE usa", paragraphs: ["Hoje usamos apenas tecnologias estritamente necessárias. Não usamos analytics, pixels de publicidade, gravação de sessão nem cookies de marketing. Por isso não exibimos banner de consentimento."] },
  { title: "3. Categorias", bullets: [
    "Necessários — sempre ativos; não exigem consentimento.",
    "Funcionais, Analytics e Marketing — não utilizados atualmente. Se forem adotados, só serão carregados após sua autorização expressa.",
  ] },
  { title: "4. Fontes do site", paragraphs: ["As fontes tipográficas são carregadas do Google Fonts, que recebe o endereço IP do seu navegador ao baixá-las. Não há cookies envolvidos."] },
];

export function Cookies10() {
  return (
    <LegalPage title="Política de Cookies" version="1.0" effective="05/10/2026" sections={sections}>
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold sm:text-xl">5. Inventário</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-muted/50"><tr>{["Nome", "Fornecedor", "Finalidade", "Tipo", "Duração"].map((h) => <th key={h} scope="col" className="p-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{ITENS.map((r) => <tr key={r[0]} className="border-t">{r.map((c) => <td key={c} className="p-2 align-top text-foreground/90">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Todos classificados como estritamente necessários.</p>
      </section>
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold sm:text-xl">6. Gerenciar preferências</h2>
        <p className="mt-3 text-sm text-foreground/90">Você pode registrar ou alterar suas escolhas a qualquer momento, e também apagar os dados do site nas configurações do navegador.</p>
        <PrivacyPreferences triggerClassName="mt-3 inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent" />
      </section>
    </LegalPage>
  );
}
