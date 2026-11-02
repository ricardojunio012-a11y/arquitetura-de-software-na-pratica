// Testes: cada padrão isolado, com dublês no lugar dos provedores.
import { describe, expect, it } from "vitest";
import { AntecedenciaMinima, UnidadeEmDia } from "../src/aprovacao.ts";
import { Reserva } from "../src/estado.ts";
import { Barramento, type Evento } from "../src/eventos.ts";
import {
  ComRegistro,
  ComRetentativas,
  Email,
  FabricaDeCanais,
  ProvedorSimulado,
  Sms,
} from "../src/notificacao.ts";
import { RepositorioEmMemoria } from "../src/repositorio.ts";
import type { Morador, Pedido } from "../src/tipos.ts";

const morador: Morador = {
  nome: "Diego",
  email: "d@x.com",
  telefone: "+55",
  canal: "sms",
};
const espaco = {
  id: "salao",
  nome: "Salão",
  taxaCentavos: 15000,
  antecedenciaMinimaDias: 2,
  limitePorMes: 1,
};
const pedido: Pedido = {
  id: "R-1",
  unidade: { id: "A-1", emDebito: false, morador },
  espaco,
  data: "2026-03-03",
};
const mensagem = { titulo: "Teste", texto: "olá" };

describe("Decorator", () => {
  it("retentativas por fora e registro por dentro: cada tentativa é registrada", () => {
    const provedor = new ProvedorSimulado({ "+55": 2 });
    const registro: string[] = [];
    const esperas: number[] = [];
    const comRegistro = new ComRegistro(new Sms(provedor), registro);
    const canal = new ComRetentativas(comRegistro, 3, (ms) => esperas.push(ms));
    canal.enviar(morador, mensagem);
    expect(registro).toEqual([
      "sms para Diego: falhou (provedor indisponível)",
      "sms para Diego: falhou (provedor indisponível)",
      "sms para Diego: entregue (Teste)",
    ]);
    expect(esperas).toEqual([100, 200]); // espera crescente
  });

  it("falha definitiva não é repetida", () => {
    const provedor = new ProvedorSimulado({}, ["d@x.com"]);
    const registro: string[] = [];
    const comRegistro = new ComRegistro(new Email(provedor), registro);
    const canal = new ComRetentativas(comRegistro, 3, () => {});
    expect(() => canal.enviar(morador, mensagem)).toThrow("sem nova tentativa");
    expect(registro).toHaveLength(1);
  });
});

describe("State", () => {
  it("a reserva aceita só as transições do estado em que está", () => {
    const reserva = new Reserva(pedido);
    reserva.aprovar();
    reserva.cancelar();
    expect(reserva.estado).toBe("cancelada");
    expect(() => reserva.aprovar()).toThrow(
      "não é possível aprovar uma reserva cancelada",
    );
  });
});

describe("Repository", () => {
  it("salvarSeLivre recusa o segundo pedido para o mesmo espaço e data", () => {
    const reservas = new RepositorioEmMemoria();
    const primeira = new Reserva(pedido);
    expect(reservas.salvarSeLivre(primeira)).toBe(true);
    primeira.aprovar();
    expect(reservas.salvarSeLivre(new Reserva({ ...pedido, id: "R-2" }))).toBe(false);
  });
});

describe("Factory", () => {
  it("escolhe o canal pela preferência e usa e-mail se não conhecer o canal", () => {
    const fabrica = new FabricaDeCanais(new ProvedorSimulado({}), [], () => {});
    expect(fabrica.para(morador).nome).toBe("sms");
    expect(fabrica.para({ ...morador, canal: "pombo-correio" }).nome).toBe("email");
  });
});

describe("Chain of Responsibility", () => {
  it("a primeira etapa que recusa decide o motivo", () => {
    const cadeia = new UnidadeEmDia();
    cadeia.depois(new AntecedenciaMinima(new Date("2026-03-02T00:00:00Z")));
    const emDebito = { ...pedido, unidade: { ...pedido.unidade, emDebito: true } };
    expect(cadeia.avaliar(emDebito).motivo).toBe("unidade com débito em aberto");
    expect(cadeia.avaliar(pedido).motivo).toBe("antecedência mínima de 2 dias");
    expect(cadeia.avaliar({ ...pedido, data: "2026-03-10" })).toEqual({
      aprovada: true,
    });
  });
});

describe("Observer", () => {
  it("um assinante que falha não impede os outros", () => {
    const eventos = new Barramento();
    const recebidos: string[] = [];
    eventos.assinar("ReservaConfirmada", {
      nome: "Quebrado",
      tratar: () => {
        throw new Error("fora do ar");
      },
    });
    eventos.assinar("ReservaConfirmada", {
      nome: "Portaria",
      tratar: (e: Evento) => recebidos.push(e.pedido.id),
    });
    eventos.publicar({ tipo: "ReservaConfirmada", pedido });
    expect(recebidos).toEqual(["R-1"]);
    expect(eventos.falhas).toEqual(["ReservaConfirmada R-1: Quebrado: fora do ar"]);
  });
});
