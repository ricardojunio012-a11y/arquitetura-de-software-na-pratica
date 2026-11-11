// O caso de negócio: quanto a dívida do ponto quente custa por trimestre e
// quanto custa pagá-la, com o custo de atraso de uma novidade que passa por ali.
// As horas vêm do histórico; o resto, de premissas.json.
import type { Mudanca } from "./git.ts";

export type Premissas = {
  valorHora: number;
  valorPessoaDia: number;
  pagamento: { pessoasDia: number; pessoas: number; reducaoDosJuros: number };
  pagarJunto: { pessoasDia: number; reducaoDosJuros: number };
  novidade: {
    nome: string;
    condominios: number;
    adesao: number;
    precoMensal: number;
    semanasHoje: number;
    semanasDepois: number;
  };
};

export type Juros = {
  mudancasNoArquivo: number;
  horasNoArquivo: number; // média por mudança
  horasNoResto: number;
  correcoesNoArquivo: number; // fração
  correcoesNoResto: number;
  horasAMaisPorTrimestre: number;
  jurosPorTrimestre: number; // R$
};

const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

// Compara as mudanças que tocam o arquivo com as que não tocam, num período.
export function juros(
  mudancas: Mudanca[],
  arquivo: string,
  trimestres: number,
  valorHora: number,
): Juros {
  const comHoras = mudancas.filter((m) => m.horas !== null);
  const noArquivo = comHoras.filter((m) => m.arquivos.includes(arquivo));
  const noResto = comHoras.filter((m) => !m.arquivos.includes(arquivo));
  const correcao = (m: Mudanca) => m.assunto.startsWith("fix");
  const horasNoArquivo = media(noArquivo.map((m) => m.horas!));
  const horasNoResto = media(noResto.map((m) => m.horas!));
  const aMais = ((horasNoArquivo - horasNoResto) * noArquivo.length) / trimestres;
  return {
    mudancasNoArquivo: noArquivo.length,
    horasNoArquivo,
    horasNoResto,
    correcoesNoArquivo: noArquivo.filter(correcao).length / noArquivo.length,
    correcoesNoResto: noResto.filter(correcao).length / noResto.length,
    horasAMaisPorTrimestre: aMais,
    jurosPorTrimestre: aMais * valorHora,
  };
}

export type Opcao = {
  nome: string;
  semanasAteANovidade: number;
  custoDoPagamento: number;
  jurosPorAno: number;
  atrasoDaNovidade: number; // R$, em relação à opção mais rápida
  total12: number; // custo em 12 meses
  total24: number; // custo em 24 meses
};

// Três opções: não pagar; pagar tudo antes da novidade; pagar junto com ela
// a parte do arquivo que a novidade toca, com as mesmas pessoas.
export function opcoes(j: Juros, p: Premissas): Opcao[] {
  const { pagamento: pg, pagarJunto: pj, novidade: nv } = p;
  const atrasoPorSemana = (nv.condominios * nv.adesao * nv.precoMensal * 12) / 52;
  const semanas = (pessoasDia: number) => pessoasDia / pg.pessoas / 5;
  const jurosPorAno = 4 * j.jurosPorTrimestre;
  const base = [
    {
      nome: "não pagar",
      semanasAteANovidade: nv.semanasHoje,
      custoDoPagamento: 0,
      jurosPorAno,
    },
    {
      nome: "pagar antes",
      semanasAteANovidade: semanas(pg.pessoasDia) + nv.semanasDepois,
      custoDoPagamento: pg.pessoasDia * p.valorPessoaDia,
      jurosPorAno: jurosPorAno * (1 - pg.reducaoDosJuros),
    },
    {
      nome: "pagar junto",
      semanasAteANovidade: semanas(pj.pessoasDia) + nv.semanasDepois,
      custoDoPagamento: pj.pessoasDia * p.valorPessoaDia,
      jurosPorAno: jurosPorAno * (1 - pj.reducaoDosJuros),
    },
  ];
  const maisRapida = Math.min(...base.map((o) => o.semanasAteANovidade));
  return base.map((o) => {
    const atraso = (o.semanasAteANovidade - maisRapida) * atrasoPorSemana;
    return {
      ...o,
      atrasoDaNovidade: atraso,
      total12: o.custoDoPagamento + o.jurosPorAno + atraso,
      total24: o.custoDoPagamento + 2 * o.jurosPorAno + atraso,
    };
  });
}
