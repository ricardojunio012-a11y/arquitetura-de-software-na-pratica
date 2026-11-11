// As decisões dos algoritmos de balanceamento, com servidores em estados conhecidos.
import { describe, expect, it } from "vitest";
import {
  duasEscolhas,
  hashDaChave,
  menosConexoes,
  sorteador,
} from "../src/balanceamento.ts";

const servidores = [{ emAndamento: 5 }, { emAndamento: 1 }, { emAndamento: 3 }];

describe("algoritmos de balanceamento", () => {
  it("menos conexões escolhe o servidor menos ocupado", () => {
    expect(menosConexoes(servidores, 0, Math.random)).toBe(1);
  });

  it("o hash manda o mesmo condomínio sempre ao mesmo servidor", () => {
    expect(hashDaChave(servidores, 7, Math.random)).toBe(
      hashDaChave(servidores, 7, Math.random),
    );
  });

  it("duas escolhas favorece o servidor menos ocupado", () => {
    // Com dois servidores, só fica com o mais ocupado se sortear ele duas vezes: 25%
    const dois = [{ emAndamento: 5 }, { emAndamento: 1 }];
    const sorteio = sorteador(1);
    const escolhas = Array.from({ length: 1000 }, () => duasEscolhas(dois, 0, sorteio));
    const noMenosOcupado = escolhas.filter((s) => s === 1).length;
    expect(noMenosOcupado).toBeGreaterThan(700);
  });
});
