// A correção do N+1 com um banco falso que conta as consultas: a versão corrigida faz
// uma consulta só, qualquer que seja o número de unidades.
import { describe, expect, it } from "vitest";
import {
  type Consultor,
  inadimplenciaCorrigida,
  inadimplenciaN1,
} from "../src/inadimplencia.ts";

class BancoFalso implements Consultor {
  consultas = 0;

  async query(sql: string) {
    this.consultas++;
    if (sql.includes("JOIN")) return { rows: [] };
    if (sql.startsWith("SELECT id, codigo")) {
      return {
        rows: Array.from({ length: 50 }, (_, i) => ({ id: i, codigo: `U-${i}` })),
      };
    }
    return { rows: [{ total: 0 }] };
  }
}

describe("rota de inadimplência", () => {
  it("o N+1 faz uma consulta por unidade; a corrigida, uma só", async () => {
    const n1 = new BancoFalso();
    await inadimplenciaN1(n1, 1);
    expect(n1.consultas).toBe(51);
    const corrigida = new BancoFalso();
    await inadimplenciaCorrigida(corrigida, 1);
    expect(corrigida.consultas).toBe(1);
  });
});
