// Testes: a tela inicial numa chamada, o lote idempotente e o conflito detectado.
import { describe, expect, it } from "vitest";
import { Portaria, Reservas } from "../src/backend.ts";
import { BffPorteiro } from "../src/bff.ts";

function montar() {
  const portaria = new Portaria([{ encomenda: "E-1", unidade: "A-1" }]);
  const reservas = new Reservas([{ reserva: "R-1", espaco: "salao", nomes: ["Ana"] }]);
  return new BffPorteiro(portaria, reservas);
}

const entregar = {
  id: "op-A1",
  tipo: "entregar" as const,
  encomenda: "E-1",
  versaoVista: 1,
  hora: "09:00",
};

describe("BFF do porteiro", () => {
  it("monta a tela inicial com encomendas e visitantes numa chamada", () => {
    const tela = montar().inicio();
    expect(tela.encomendasPendentes).toEqual([
      { encomenda: "E-1", unidade: "A-1", versao: 1 },
    ]);
    expect(tela.visitantesEsperados.map((v) => v.nome)).toEqual(["Ana"]);
  });

  it("não confunde um visitante com outro cujo nome contém o dele", () => {
    const portaria = new Portaria([]);
    const nomes = ["Ana", "Maria Ana"];
    const bff = new BffPorteiro(
      portaria,
      new Reservas([{ reserva: "R-1", espaco: "salao", nomes }]),
    );
    bff.sincronizar("A", [
      {
        id: "op-A1",
        tipo: "registrarVisitante",
        nome: "Maria Ana",
        reserva: "R-1",
        hora: "09:00",
      },
    ]);
    expect(bff.inicio().visitantesEsperados.map((v) => v.nome)).toEqual(["Ana"]);
  });

  it("não aplica duas vezes um lote reenviado", () => {
    const bff = montar();
    bff.sincronizar("A", [entregar]);
    const [[, resultado]] = bff.sincronizar("A", [entregar]);
    expect(resultado).toBe("aplicada");
    expect(bff.repetidas).toBe(1);
  });

  it("com os resultados persistidos, reconhece o lote depois de reiniciar", () => {
    const portaria = new Portaria([{ encomenda: "E-1", unidade: "A-1" }]);
    const reservas = new Reservas([]);
    const tabela = new Map<string, string>();
    new BffPorteiro(portaria, reservas, tabela).sincronizar("A", [entregar]);
    const depois = new BffPorteiro(portaria, reservas, tabela);
    const [[, resultado]] = depois.sincronizar("A", [entregar]);
    expect(resultado).toBe("aplicada");
    expect(depois.repetidas).toBe(1);
  });

  it("acusa conflito quando a encomenda mudou depois que o tablet a viu", () => {
    const bff = montar();
    bff.sincronizar("B", [{ ...entregar, id: "op-B1", tipo: "devolver" }]);
    const [[, resultado]] = bff.sincronizar("A", [entregar]);
    expect(resultado).toBe("conflito: E-1 já devolvida pelo tablet B às 09:00");
  });
});
