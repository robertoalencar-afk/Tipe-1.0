import { describe, expect, it } from "vitest";
import { ENVIO_RESERVA_HABILITADO, prepararMensagem } from "./mensagens";

const D = {
  nome: "Ana Clara Souza",
  restaurante: "Maré Alta",
  dia: "sexta, 14/11",
  hora: "20:00",
  pessoas: 2,
  codigo: "TG-4Q7K",
};

describe("mensagens da reserva", () => {
  it("o envio está desligado e nada é marcado para enviar", () => {
    expect(ENVIO_RESERVA_HABILITADO).toBe(false);
    for (const tipo of ["confirmada", "lembrete", "cancelada", "espera_mesa_livre"] as const)
      for (const canal of ["email", "whatsapp"] as const)
        expect(prepararMensagem(canal, tipo, D)).toMatchObject({
          enviar: false,
          motivo: "envio_desligado",
        });
  });

  it("usa só o primeiro nome e os dados da reserva", () => {
    const m = prepararMensagem("whatsapp", "confirmada", D);
    expect(m.corpo).toContain("Oi, Ana!");
    expect(m.corpo).not.toContain("Souza");
    expect(m.corpo).toContain("20:00");
    expect(m.corpo).toContain("TG-4Q7K");
  });

  it("lista de espera diz o prazo para responder", () => {
    expect(
      prepararMensagem("whatsapp", "espera_mesa_livre", { ...D, pessoas: 1, minutosResposta: 10 })
        .corpo,
    ).toContain("1 pessoa. Confirme no app em até 10 minutos");
  });
});
