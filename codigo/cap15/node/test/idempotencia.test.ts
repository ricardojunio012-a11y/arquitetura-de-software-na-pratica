// Testes de integração da idempotência contra o PostgreSQL: cinco pedidos
// simultâneos com a mesma chave resultam num único pagamento, e todos recebem a mesma
// resposta; a mesma chave em duas administradoras são dois pedidos diferentes.
import { describe, expect, it } from "vitest";
import { criarApi, subir } from "../src/api/api.ts";
import { prepararBanco } from "../src/api/banco.ts";

const pagar = (url: string, administradora: string, cobranca: string, valor: number) =>
  fetch(`${url}/v1/pagamentos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Morada-Administradora": administradora,
      "Idempotency-Key": "k-1",
    },
    body: JSON.stringify({ cobranca, valorCentavos: valor }),
  });

describe.skipIf(!process.env.BANCO_URL)("idempotência no PostgreSQL", () => {
  it("pedidos simultâneos com a mesma chave pagam uma vez só", async () => {
    const banco = await prepararBanco(
      process.env.BANCO_URL!,
      "/dados/entrada/cobrancas.json",
    );
    const api = criarApi(banco);
    const url = await subir(api);
    const pedido = () => pagar(url, "ADM-A", "CB-04", 45000);
    const respostas = await Promise.all([1, 2, 3, 4, 5].map(pedido));
    const corpos = await Promise.all(respostas.map((r) => r.json()));
    expect(respostas.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    expect(new Set(corpos.map((c) => c.id)).size).toBe(1);
    const { rows } = await banco.query("SELECT count(*)::int AS total FROM pagamentos");
    expect(rows[0].total).toBe(1);
    api.close();
    await banco.end();
  });

  it("a mesma chave em duas administradoras não colide", async () => {
    const banco = await prepararBanco(
      process.env.BANCO_URL!,
      "/dados/entrada/cobrancas.json",
    );
    const api = criarApi(banco);
    const url = await subir(api);
    const a = await pagar(url, "ADM-A", "CB-04", 45000);
    const b = await pagar(url, "ADM-B", "CB-05", 38000);
    expect([a.status, b.status]).toEqual([201, 201]);
    const [corpoA, corpoB] = [await a.json(), await b.json()];
    expect(corpoA.cobranca).toBe("CB-04");
    expect(corpoB.cobranca).toBe("CB-05");
    const { rows } = await banco.query("SELECT count(*)::int AS total FROM pagamentos");
    expect(rows[0].total).toBe(2);
    api.close();
    await banco.end();
  });
});
