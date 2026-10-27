/**
 * Tipe Staff na home: a mesma montagem do topo da página do Staff (foto com a pilha de
 * avisos no alto, rosto livre), ao lado do texto.
 */
import { MontagemStaff } from "./produto/TopoStaff";
import { BotaoSecundario, Secao, Titulo } from "./Site";

export function StaffHome() {
  return (
    <Secao tema="claro" id="equipe">
      <div className="container-page grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Titulo
            rotulo="Tipe Staff"
            titulo="A equipe sabe de tudo, na hora."
            texto="O garçom vê no celular qual mesa já pagou, recebe a gorjeta extra com o nome dele e saca o saldo por Pix a cada quinzena."
          />
          <BotaoSecundario href="/produtos/staff" className="mt-8">
            Conhecer o Tipe Staff
          </BotaoSecundario>
        </div>
        <MontagemStaff />
      </div>
    </Secao>
  );
}
