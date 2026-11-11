// O bloqueio otimista com um banco falso: se a versão mudou entre a leitura e a
// gravação, a reserva é desfeita e recusada.
import type pg from "pg";
import { describe, expect, it } from "vitest";
import { reservarOtimista } from "../src/reservar.ts";

function bancoFalso(versaoMudou: boolean) {
  const comandos: string[] = [];
  const banco = {
    async query(sql: string) {
      comandos.push(sql.split(" ")[0]);
      if (sql.startsWith("SELECT versao")) return { rows: [{ versao: 7 }] };
      if (sql.startsWith("SELECT 1")) return { rows: [] };
      if (sql.startsWith("UPDATE")) return { rowCount: versaoMudou ? 0 : 1, rows: [] };
      return { rows: [], rowCount: 1 };
    },
  };
  return { banco: banco as unknown as pg.Client, comandos };
}

describe("bloqueio otimista", () => {
  const pedido = {
    morador: "Ana",
    inicio: "2026-11-07 12:00",
    fim: "2026-11-07 16:00",
  };

  it("confirma quando a versão continua a mesma", async () => {
    const { banco, comandos } = bancoFalso(false);
    expect(await reservarOtimista(banco, pedido)).toBe(true);
    expect(comandos.at(-1)).toBe("COMMIT");
  });

  it("desfaz e recusa quando outra reserva mudou a versão", async () => {
    const { banco, comandos } = bancoFalso(true);
    expect(await reservarOtimista(banco, pedido)).toBe(false);
    expect(comandos.at(-1)).toBe("ROLLBACK");
  });
});
