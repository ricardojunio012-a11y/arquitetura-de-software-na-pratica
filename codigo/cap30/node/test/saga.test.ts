// O orquestrador com um banco falso: compensações em ordem inversa e o pivô.
import type pg from "pg";
import { describe, expect, it } from "vitest";
import { executarSaga, type Passo } from "../src/saga.ts";
import { cpfValido } from "../src/servicos.ts";

const bancoFalso = () =>
  ({
    async query(sql: string) {
      if (sql.startsWith("SELECT")) return { rows: [{ concluidos: 0 }] };
      return { rows: [] };
    },
  }) as unknown as pg.Client;

const rapido = { tentativasDepoisDoPivo: 5, esperaBaseMs: 1 };

describe("saga", () => {
  it("compensa os passos concluídos em ordem inversa", async () => {
    const feito: string[] = [];
    const passo = (nome: string, falha = false): Passo => ({
      nome,
      executar: async () => {
        if (falha) throw new Error("erro");
        feito.push(nome);
      },
      compensar: async () => {
        feito.push(`desfaz ${nome}`);
      },
    });
    const resultado = await executarSaga(bancoFalso(), "s", [
      passo("a"),
      passo("b"),
      passo("c", true),
    ]);
    expect(resultado).toBe("compensada");
    expect(feito).toEqual(["a", "b", "desfaz b", "desfaz a"]);
  });

  it("depois do pivô, tenta de novo em vez de compensar", async () => {
    let tentativas = 0;
    const resultado = await executarSaga(
      bancoFalso(),
      "s",
      [
        { nome: "pivo", executar: async () => {}, pivo: true },
        {
          nome: "depois",
          executar: async () => {
            if (++tentativas < 3) throw new Error("fora do ar");
          },
        },
      ],
      undefined,
      rapido,
    );
    expect(resultado).toBe("concluida");
    expect(tentativas).toBe(3);
  });

  it("depois do pivô, para a saga quando as tentativas se esgotam", async () => {
    let tentativas = 0;
    const resultado = await executarSaga(
      bancoFalso(),
      "s",
      [
        { nome: "pivo", executar: async () => {}, pivo: true },
        {
          nome: "depois",
          executar: async () => {
            tentativas++;
            throw new Error("fora do ar");
          },
        },
      ],
      undefined,
      rapido,
    );
    expect(resultado).toBe("parada");
    expect(tentativas).toBe(5);
  });
});

describe("cpf", () => {
  it("confere os dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-26")).toBe(false);
  });
});
