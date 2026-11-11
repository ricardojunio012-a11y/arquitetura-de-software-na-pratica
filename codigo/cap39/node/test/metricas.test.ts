import { describe, expect, it } from "vitest";
import { opcoes, juros, type Premissas } from "../src/caso.ts";
import { interpretarLog, type Mudanca } from "../src/git.ts";
import { planejar } from "../src/historico.ts";
import {
  acoplamento,
  complexidade,
  filtrar,
  importa,
  pontosQuentes,
} from "../src/metricas.ts";

const m = (
  arquivos: string[],
  horas = 1,
  assunto = "feat: x",
  autor = "Ana",
): Mudanca => ({
  autor,
  data: "2026-01-02",
  assunto,
  horas,
  arquivos,
});

describe("leitura do log", () => {
  it("separa commits, horas e arquivos", () => {
    const log =
      "@@\tAna Lima\t2026-01-05\tfeat(x): y\t7\n\n3\t1\tsrc/a.ts\n-\t-\tlogo.png\n";
    expect(interpretarLog(log)).toEqual([
      {
        autor: "Ana Lima",
        data: "2026-01-05",
        assunto: "feat(x): y",
        horas: 7,
        arquivos: ["src/a.ts", "logo.png"],
      },
    ]);
  });
  it("aceita commit sem o trailer de horas", () => {
    expect(interpretarLog("@@\tAna\t2026-01-05\tfix: z\t\n1\t0\ta.ts\n")[0].horas).toBe(
      null,
    );
  });
});

describe("métricas", () => {
  it("mede a complexidade pela indentação", () => {
    expect(complexidade("a\n  b\n    c\n\n  d\n")).toBe(4);
  });
  it("ignora commits grandes", () => {
    const grande = m(Array.from({ length: 11 }, (_, i) => `f${i}.ts`));
    expect(filtrar([grande, m(["a.ts"])])).toHaveLength(1);
  });
  it("prioriza o que muda muito e é complexo", () => {
    const atuais = new Map([
      ["quente.ts", "a\n    b\n    c\n"],
      ["feio.ts", "a\n        b\n        c\n"],
      ["simples.ts", "a\n  b\n"],
    ]);
    const hist = [
      ...Array.from({ length: 10 }, () => m(["quente.ts"])),
      m(["feio.ts"]),
      ...Array.from({ length: 10 }, () => m(["simples.ts"])),
    ];
    const lista = pontosQuentes(hist, atuais);
    expect(lista.map((p) => p.arquivo)).toEqual(["quente.ts", "simples.ts", "feio.ts"]);
    expect(lista[0].prioridade).toBe(50);
  });
  it("calcula o grau de acoplamento de mudança", () => {
    const hist = [
      ...Array.from({ length: 6 }, () => m(["a.ts", "b.ts"])),
      ...Array.from({ length: 4 }, () => m(["a.ts"])),
      m(["c.ts", "a.ts"]),
    ];
    const pares = acoplamento(hist);
    expect(pares).toHaveLength(1);
    expect(pares[0]).toMatchObject({ a: "a.ts", b: "b.ts", juntos: 6 });
    expect(pares[0].grau).toBeCloseTo(6 / ((11 + 6) / 2));
  });
  it("reconhece um import entre os arquivos", () => {
    const texto = 'import { emitirBoleto } from "./boleto.ts";\n';
    expect(importa(texto, "src/financeiro/boleto.ts")).toBe(true);
    expect(importa(texto, "src/financeiro/pix.ts")).toBe(false);
  });
});

describe("caso de negócio", () => {
  const premissas: Premissas = {
    valorHora: 150,
    valorPessoaDia: 1200,
    pagamento: { pessoasDia: 30, pessoas: 2, reducaoDosJuros: 0.5 },
    pagarJunto: { pessoasDia: 15, reducaoDosJuros: 0.35 },
    novidade: {
      nome: "x",
      condominios: 3000,
      adesao: 0.1,
      precoMensal: 40,
      semanasHoje: 6,
      semanasDepois: 4,
    },
  };
  it("compara as horas do arquivo com as do resto", () => {
    const hist = [
      m(["q.ts"], 10, "fix: a"),
      m(["q.ts"], 6),
      m(["r.ts"], 2),
      m(["s.ts"], 4),
    ];
    const j = juros(hist, "q.ts", 1, 150);
    expect(j.horasNoArquivo).toBe(8);
    expect(j.horasNoResto).toBe(3);
    expect(j.horasAMaisPorTrimestre).toBe(10);
    expect(j.jurosPorTrimestre).toBe(1500);
    expect(j.correcoesNoArquivo).toBe(0.5);
  });
  it("cobra o atraso da novidade de quem chega depois", () => {
    const j = juros([m(["q.ts"], 10), m(["r.ts"], 2)], "q.ts", 1, 150);
    const [naoPagar, antes, junto] = opcoes(j, premissas);
    expect(junto.semanasAteANovidade).toBe(5.5);
    expect(junto.atrasoDaNovidade).toBe(0);
    expect(naoPagar.atrasoDaNovidade).toBeCloseTo((0.5 * 12000 * 12) / 52);
    expect(antes.semanasAteANovidade).toBe(7);
    expect(antes.atrasoDaNovidade).toBeCloseTo((1.5 * 12000 * 12) / 52);
    expect(antes.custoDoPagamento).toBe(36000);
    expect(antes.total24).toBe(36000 + 2 * antes.jurosPorAno + antes.atrasoDaNovidade);
  });
});

describe("histórico simulado", () => {
  it("é o mesmo a cada execução", () => {
    const a = planejar().map((c) => [c.quando, c.assunto, [...c.mudancas.keys()]]);
    const b = planejar().map((c) => [c.quando, c.assunto, [...c.mudancas.keys()]]);
    expect(a).toEqual(b);
  });
});
