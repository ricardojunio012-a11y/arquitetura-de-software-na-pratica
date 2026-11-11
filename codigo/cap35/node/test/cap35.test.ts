// As contas de disponibilidade e o balanceador, sem rede.
import { describe, expect, it } from "vitest";
import { Balanceador, type Replica } from "../src/balanceador.ts";
import * as d from "../src/disponibilidade.ts";

describe("disponibilidade composta", () => {
  it("em série, as disponibilidades se multiplicam", () => {
    expect(d.emSerie([0.999, 0.999, 0.999])).toBeCloseTo(0.997003, 6);
  });

  it("em paralelo, as indisponibilidades se multiplicam", () => {
    expect(d.emParalelo([0.99, 0.99])).toBeCloseTo(0.9999, 6);
  });

  it("um componente comum limita o conjunto", () => {
    const juntas = d.comComum(0.999, [0.995, 0.995]);
    expect(juntas).toBeLessThan(0.999);
    expect(juntas).toBeLessThan(d.emParalelo([0.995, 0.995]));
  });

  it("converte em horas fora do ar por ano", () => {
    expect(d.horasForaPorAno(0.999)).toBeCloseTo(8.76, 2);
  });
});

describe("balanceador", () => {
  const a: Replica = { nome: "a", zona: "1" };
  const b: Replica = { nome: "b", zona: "2" };
  const fora = new Set<string>();
  const transporte = async (r: Replica) => !fora.has(r.nome);

  it("reveza entre as réplicas", async () => {
    const vistas: string[] = [];
    const lb = new Balanceador([a, b], async (r) => (vistas.push(r.nome), true), false);
    for (let i = 0; i < 4; i++) await lb.pedir();
    expect(vistas).toEqual(["a", "b", "a", "b"]);
  });

  it("sem tentar outra, metade dos pedidos falha com uma réplica fora", async () => {
    fora.clear();
    fora.add("a");
    const lb = new Balanceador([a, b], transporte, false);
    const r = await Promise.all([1, 2, 3, 4].map(() => lb.pedir()));
    expect(r.filter(Boolean)).toHaveLength(2);
  });

  it("tentando a outra, nenhum pedido falha com uma réplica fora", async () => {
    fora.clear();
    fora.add("a");
    const lb = new Balanceador([a, b], transporte, true);
    for (let i = 0; i < 4; i++) expect(await lb.pedir()).toBe(true);
  });

  it("com as duas fora, tentar a outra não adianta", async () => {
    fora.clear();
    fora.add("a").add("b");
    const lb = new Balanceador([a, b], transporte, true);
    expect(await lb.pedir()).toBe(false);
  });
});
