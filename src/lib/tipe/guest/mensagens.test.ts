import { describe, expect, it } from "vitest";
import {
  codigoReserva,
  diaHora,
  ENVIO_RESERVA_HABILITADO,
  inicioDoSlot,
  MODELO_WHATSAPP,
  planejarEnvio,
  prepararMensagem,
  telefoneWhatsApp,
} from "./mensagens";

const D = {
  nome: "Ana Clara Souza",
  restaurante: "Maré Alta",
  dia: "sexta, 14/11",
  hora: "20:00",
  pessoas: 2,
  codigo: "TG-4Q7K",
};

const TUDO = { resendApiKey: "re_x", whatsappToken: "t", whatsappPhoneNumberId: "1", whatsappModelos: "aprovados" };

describe("mensagens da reserva", () => {
  it("o envio está ligado e cada tipo tem modelo do WhatsApp", () => {
    expect(ENVIO_RESERVA_HABILITADO).toBe(true);
    for (const tipo of ["confirmada", "lembrete", "cancelada", "espera_mesa_livre"] as const) {
      const m = prepararMensagem("whatsapp", tipo, D);
      expect(m.modelo).toBe(MODELO_WHATSAPP[tipo]);
      expect(m.parametros.length).toBeGreaterThan(2);
      expect(m.parametros.every((x) => x.length > 0)).toBe(true);
    }
  });

  it("usa só o primeiro nome e os dados da reserva", () => {
    const m = prepararMensagem("whatsapp", "confirmada", D);
    expect(m.corpo).toContain("Oi, Ana!");
    expect(m.corpo).not.toContain("Souza");
    expect(m.corpo).toContain("20:00");
    expect(m.corpo).toContain("TG-4Q7K");
    expect(m.parametros).toEqual(["Ana", "Maré Alta", "sexta, 14/11", "20:00", "2 pessoas", "TG-4Q7K"]);
  });

  it("lista de espera diz o prazo para responder", () => {
    expect(
      prepararMensagem("whatsapp", "espera_mesa_livre", { ...D, pessoas: 1, minutosResposta: 10 })
        .corpo,
    ).toContain("1 pessoa. Confirme no app em até 10 minutos");
  });
});

describe("plano de envio", () => {
  it("com tudo configurado, sai pelos dois canais", () => {
    expect(planejarEnvio(TUDO, { email: "a@b.com", telefone: "85 98888-7777" }).map((p) => p.vai)).toEqual([true, true]);
  });
  it("sem chave, pula o canal sem erro", () => {
    expect(planejarEnvio({}, { email: "a@b.com", telefone: "85988887777" })).toEqual([
      { canal: "email", vai: false, motivo: "sem_chave" },
      { canal: "whatsapp", vai: false, motivo: "sem_chave" },
    ]);
  });
  it("WhatsApp só sai com os modelos aprovados na Meta", () => {
    const [, wa] = planejarEnvio({ ...TUDO, whatsappModelos: undefined }, { telefone: "85988887777" });
    expect(wa).toEqual({ canal: "whatsapp", vai: false, motivo: "modelo_pendente" });
  });
  it("sem e-mail ou telefone válido, pula", () => {
    expect(planejarEnvio(TUDO, { telefone: "123" }).map((p) => p.motivo)).toEqual(["sem_contato", "sem_contato"]);
  });
});

describe("formatos", () => {
  it("telefone brasileiro ganha o DDI 55", () => {
    expect(telefoneWhatsApp("(85) 98888-7777")).toBe("5585988887777");
    expect(telefoneWhatsApp("+55 85 98888-7777")).toBe("5585988887777");
    expect(telefoneWhatsApp("")).toBeNull();
  });
  it("código estável a partir do id", () => {
    expect(codigoReserva("4f7a2c10-0000-4000-8000-000000000000")).toBe("TR-4F7A2C");
  });
  it("lê o início do tstzrange e formata no fuso do restaurante", () => {
    const d = inicioDoSlot('["2026-11-14 23:00:00+00","2026-11-15 00:30:00+00")')!;
    expect(d.toISOString()).toBe("2026-11-14T23:00:00.000Z");
    expect(diaHora(d, "America/Fortaleza")).toEqual({ dia: "sábado, 14/11", hora: "20:00" });
    expect(inicioDoSlot("lixo")).toBeNull();
  });
});
