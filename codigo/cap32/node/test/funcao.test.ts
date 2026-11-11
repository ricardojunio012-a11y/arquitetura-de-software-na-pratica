import { describe, expect, it } from "vitest";
import { gerarPdf, handler } from "../src/funcao/prestacao.ts";
import { executar, FUNCAO } from "../src/plataforma.ts";
import { prestacaoExemplo } from "../src/prestacoes.ts";

describe("a função da prestação de contas", () => {
  it("gera um PDF válido, com a tabela xref apontando para cada objeto", () => {
    const pdf = gerarPdf(prestacaoExemplo(0, 100));
    const s = pdf.toString("latin1");
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    const xref = Number(s.match(/startxref\n(\d+)/)![1]);
    expect(s.slice(xref, xref + 4)).toBe("xref");
    const posicoes = [...s.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    posicoes.forEach((p, i) =>
      expect(s.slice(p).startsWith(`${i + 1} 0 obj`)).toBe(true),
    );
  });

  it("gera sempre o mesmo PDF para os mesmos lançamentos", () => {
    expect(gerarPdf(prestacaoExemplo(1, 80))).toEqual(
      gerarPdf(prestacaoExemplo(1, 80)),
    );
  });

  it("sem bucket, o handler só devolve a chave e o resumo", async () => {
    delete process.env.BUCKET;
    const r = await handler(prestacaoExemplo(0, 100));
    expect(r.chave).toBe("prestacoes/cond-0001/2026-10.pdf");
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("a plataforma de funções simulada", () => {
  it("reaproveita o ambiente quente e cobra a partida só na primeira chamada", () => {
    const e = executar([
      { chegada: 0, duracao: 100 },
      { chegada: 1000, duracao: 100 },
    ]);
    expect(e.map((x) => x.fria)).toEqual([true, false]);
    expect(e[0].cobrado).toBe(100 + FUNCAO.inicializacao);
  });

  it("descarta o ambiente parado há mais tempo que a ociosidade", () => {
    const tarde = FUNCAO.ociosidade + 1000;
    const e = executar([
      { chegada: 0, duracao: 100 },
      { chegada: tarde, duracao: 100 },
    ]);
    expect(e.map((x) => x.fria)).toEqual([true, true]);
  });

  it("com limite de concorrência, a chamada espera um ambiente livre", () => {
    const e = executar(
      [
        { chegada: 0, duracao: 1000 },
        { chegada: 0, duracao: 1000 },
      ],
      1,
    );
    expect(e.map((x) => [x.fria, x.fim])).toEqual([
      [true, 1500],
      [false, 2500],
    ]);
  });
});
