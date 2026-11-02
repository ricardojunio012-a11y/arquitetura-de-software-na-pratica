// Testes: o núcleo sem nenhum adaptador real, os adaptadores sem o núcleo real e o
// mesmo contrato verificado nos dois repositórios.
import pg from "pg";
import { describe, expect, it } from "vitest";
import { executar } from "../src/adaptadores/entrada/cli.ts";
import { AgendasEmMemoria } from "../src/adaptadores/saida/em-memoria.ts";
import { AgendasNoPostgres } from "../src/adaptadores/saida/postgres.ts";
import type {
  CasosDeUsoDeReservas,
  RepositorioDeAgendas,
} from "../src/aplicacao/portas.ts";
import { ServicoDeReservas } from "../src/aplicacao/servico-de-reservas.ts";

const salao = { id: "salao", taxaCentavos: 15000, antecedenciaMinimaDias: 2 };
const pedido = {
  reserva: "R-1",
  unidade: "A-101",
  espaco: "salao",
  data: "2026-03-14",
  inicio: 14,
  fim: 22,
  em: "2026-03-02",
};

describe("núcleo", () => {
  it("reserva e recusa sobreposição só com o repositório em memória", async () => {
    const servico = new ServicoDeReservas(new AgendasEmMemoria([salao]));
    expect((await servico.reservar(pedido)).taxa).toBe("R$ 180,00");
    await expect(servico.reservar({ ...pedido, reserva: "R-2" })).rejects.toThrow(
      "horário sobreposto a R-1",
    );
  });
});

describe("adaptador de linha de comando", () => {
  it("traduz argumentos em chamadas, sem precisar do núcleo de verdade", async () => {
    const chamadas: string[] = [];
    const falso = {
      cancelar: async (reserva: string, em: string) => {
        chamadas.push(`${reserva} ${em}`);
        return { reserva, situacao: "cancelada" as const, multa: "R$ 0,00" };
      },
    } as CasosDeUsoDeReservas;
    const [texto, codigo] = await executar(falso, ["cancelar", "R-7", "2026-03-01"]);
    expect(chamadas).toEqual(["R-7 2026-03-01"]);
    expect([texto, codigo]).toEqual(["R-7 cancelada, multa R$ 0,00", 0]);
  });

  it("mostra o uso quando faltam argumentos", async () => {
    const [texto, codigo] = await executar({} as CasosDeUsoDeReservas, ["reservar"]);
    expect(texto).toMatch(/^uso: reservar/);
    expect(codigo).toBe(2);
  });
});

// O mesmo contrato vale para qualquer adaptador da porta de saída
function contrato(nome: string, criar: () => Promise<RepositorioDeAgendas>) {
  describe(`contrato do repositório: ${nome}`, () => {
    it("guarda a agenda e a encontra pela reserva", async () => {
      const agendas = await criar();
      const agenda = await agendas.doEspaco("salao");
      agenda.reservar("R-1", "A-101", "2026-03-14", 14, 22, "2026-03-02");
      await agendas.salvar(agenda);
      const devolvida = await agendas.daReserva("R-1");
      expect(devolvida.reservas().map((r) => r.id)).toEqual(["R-1"]);
    });

    it("avisa quando o espaço ou a reserva não existem", async () => {
      const agendas = await criar();
      await expect(agendas.doEspaco("piscina")).rejects.toThrow(
        "espaço não encontrado",
      );
      await expect(agendas.daReserva("R-9")).rejects.toThrow("reserva não encontrada");
    });
  });
}

contrato("em memória", async () => new AgendasEmMemoria([salao]));

// No contêiner, o banco existe; fora dele, o teste do PostgreSQL é pulado
const url = process.env.BANCO_URL;
describe.skipIf(!url)("postgres", () => {
  contrato("PostgreSQL", async () => {
    const banco = new pg.Client({ connectionString: url });
    await banco.connect();
    const agendas = new AgendasNoPostgres(banco, [salao]);
    await agendas.preparar();
    return agendas;
  });
});
