// O disjuntor e as novas tentativas, com o relógio simulado.
import { describe, expect, it } from "vitest";
import { comNovasTentativas, Disjuntor, DisjuntorAberto } from "../src/protecoes.ts";
import { Relogio } from "../src/relogio.ts";

const falha = async () => {
  throw new Error("503");
};
const sucesso = async () => "ok";

describe("disjuntor", () => {
  const opcoes = { janela: 4, minimo: 4, limiar: 0.75, pausaMs: 1000, testes: 2 };

  it("abre depois de falhas demais e recusa sem chamar", async () => {
    const d = new Disjuntor(new Relogio(), opcoes);
    for (let i = 0; i < 4; i++) await d.chamar(falha).catch(() => {});
    expect(d.estado).toBe("aberto");
    let chamou = false;
    const espiao = async () => {
      chamou = true;
      return "ok";
    };
    await expect(d.chamar(espiao)).rejects.toBeInstanceOf(DisjuntorAberto);
    expect(chamou).toBe(false);
  });

  it("depois da pausa, testes bem-sucedidos fecham o disjuntor", async () => {
    const relogio = new Relogio();
    const d = new Disjuntor(relogio, opcoes);
    for (let i = 0; i < 4; i++) await d.chamar(falha).catch(() => {});
    relogio.agora = 1000;
    expect(await d.chamar(sucesso)).toBe("ok");
    expect(d.estado).toBe("meio-aberto");
    expect(await d.chamar(sucesso)).toBe("ok");
    expect(d.estado).toBe("fechado");
  });
});

describe("novas tentativas", () => {
  it("tenta de novo até dar certo, esperando entre as tentativas", async () => {
    const relogio = new Relogio();
    let n = 0;
    const instavel = async () => {
      if (++n < 3) throw new Error("503");
      return "ok";
    };
    const resultado = comNovasTentativas(relogio, instavel, {
      tentativas: 3,
      baseMs: 100,
      sortear: () => 0.5,
    });
    await relogio.rodar();
    expect(await resultado).toBe("ok");
    expect(n).toBe(3);
    expect(relogio.agora).toBe(150); // 50 + 100: metade de 100 e metade de 200
  });
});
