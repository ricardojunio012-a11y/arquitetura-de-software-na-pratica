// Testes: cada camada pode ser testada sem as de cima; o núcleo, sem plugins reais.
import { describe, expect, it } from "vitest";
import { ServicoDeReservas } from "../src/camadas/aplicacao/servico-de-reservas.ts";
import { criarApi } from "../src/camadas/apresentacao/api.ts";
import { RepositorioDeAgendas } from "../src/camadas/dados/repositorio.ts";
import { Agenda, RegraVioladaErro } from "../src/camadas/dominio/dominio.ts";
import { Nucleo } from "../src/plugins/nucleo.ts";

const salao = { id: "salao", taxaCentavos: 15000, antecedenciaMinimaDias: 2 };

describe("camadas", () => {
  it("o domínio recusa horário sobreposto sem saber que existe HTTP", () => {
    const agenda = new Agenda(salao);
    agenda.reservar("R-1", "A-101", "2026-03-14", 14, 22, "2026-03-02");
    expect(() =>
      agenda.reservar("R-2", "A-202", "2026-03-14", 20, 23, "2026-03-02"),
    ).toThrow(RegraVioladaErro);
  });

  it("a apresentação traduz a regra violada em 409", async () => {
    const api = criarApi(new ServicoDeReservas(new RepositorioDeAgendas([salao])));
    const corpo = {
      reserva: "R-1",
      unidade: "A-101",
      espaco: "salao",
      data: "2026-03-03",
      inicio: 10,
      fim: 12,
      em: "2026-03-02",
    };
    const resposta = await api.inject({
      method: "POST",
      url: "/reservas",
      payload: corpo,
    });
    expect(resposta.statusCode).toBe(409);
  });
});

describe("microkernel", () => {
  it("emite pelo plugin instalado e avisa quando falta plugin", () => {
    const nucleo = new Nucleo();
    nucleo.instalar({ nome: "teste", registrar: (c) => `T-${c.unidade}` });
    expect(nucleo.emitir({ unidade: "A-1", valorCentavos: 100, banco: "teste" })).toBe(
      "A-1;R$ 1,00;teste;T-A-1",
    );
    expect(nucleo.emitir({ unidade: "A-1", valorCentavos: 100, banco: "zeta" })).toBe(
      "A-1;R$ 1,00;zeta;sem plugin para o banco zeta",
    );
  });

  it("um plugin com defeito não derruba o núcleo", () => {
    const nucleo = new Nucleo();
    nucleo.instalar({
      nome: "quebrado",
      registrar: () => {
        throw new Error("fora do ar");
      },
    });
    expect(
      nucleo.emitir({ unidade: "A-1", valorCentavos: 100, banco: "quebrado" }),
    ).toBe("A-1;R$ 1,00;quebrado;falha no plugin quebrado: fora do ar");
  });

  it("recusa um plugin que não cumpre o contrato", () => {
    const nucleo = new Nucleo();
    expect(() => nucleo.instalar({ nome: "x" } as never)).toThrow("contrato");
  });
});
