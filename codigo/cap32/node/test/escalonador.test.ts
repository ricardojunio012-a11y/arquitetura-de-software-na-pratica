import { expect, it } from "vitest";
import { escolherNo, type No } from "../src/escalonador.ts";

const no = (nome: string, pedida: number, pronto = true): No => ({
  nome,
  cpu: 1600,
  pedida,
  pronto,
});

it("filtra os nós em que o pedido não cabe e prefere o de maior folga", () => {
  const nos = [no("no-01", 1500), no("no-02", 500), no("no-03", 1000)];
  expect(escolherNo(nos, 500)?.nome).toBe("no-02");
  expect(escolherNo([no("no-01", 1500)], 500)).toBeUndefined(); // fica Pending
});

it("ignora nós que ainda não estão prontos e desempata pelo nome", () => {
  expect(escolherNo([no("no-02", 0), no("no-01", 0, false)], 500)?.nome).toBe("no-02");
  expect(escolherNo([no("no-02", 0), no("no-01", 0)], 500)?.nome).toBe("no-01");
});
