// Camada anticorrupção do retorno de cobrança do Banco Alfa. O arquivo tem linhas de
// 80 posições, num layout simplificado inspirado no CNAB 240 da FEBRABAN. Tudo o que
// é do banco (posições, códigos de ocorrência, datas DDMMAAAA, valores sem vírgula,
// o "nosso número") fica aqui; o resto do Morada só vê PagamentoRecebido.
import type { PagamentoRecebido } from "../financeiro.ts";

// Posições começando em 1, como no manual do banco
const DETALHE = {
  tipo: [4, 4],
  ocorrencia: [5, 6],
  nossoNumero: [7, 26],
  data: [27, 34],
  valor: [35, 49],
  tarifa: [50, 64],
} as const;
const TRAILER = { quantidade: [5, 10], total: [11, 25] } as const;

const LIQUIDACAO = "06";
const OCORRENCIAS: Record<string, string> = {
  "02": "entrada confirmada",
  "06": "liquidação",
  "09": "baixa",
};

const campo = (linha: string, [ini, fim]: readonly [number, number]) =>
  linha.slice(ini - 1, fim).trim();

// "04112026" -> "2026-11-04"
const data = (ddmmaaaa: string) =>
  `${ddmmaaaa.slice(4)}-${ddmmaaaa.slice(2, 4)}-${ddmmaaaa.slice(0, 2)}`;

// O Morada gera o nosso número como "MORADA" + o código da cobrança
const cobranca = (nossoNumero: string) => nossoNumero.replace(/^MORADA0*/, "");

export interface Traducao {
  pagamentos: PagamentoRecebido[];
  ignoradas: string[];
}

export function traduzirRetorno(texto: string): Traducao {
  const linhas = texto.split("\n").filter((l) => l.trim());
  const detalhes = linhas.filter((l) => campo(l, DETALHE.tipo) === "3");
  const trailer = linhas.find((l) => campo(l, DETALHE.tipo) === "9");
  if (!trailer) throw new Error("retorno sem trailer: arquivo incompleto");

  const pagamentos: PagamentoRecebido[] = [];
  const ignoradas: string[] = [];
  for (const linha of detalhes) {
    const ocorrencia = campo(linha, DETALHE.ocorrencia);
    const codigo = cobranca(campo(linha, DETALHE.nossoNumero));
    if (ocorrencia !== LIQUIDACAO) {
      ignoradas.push(
        `${codigo}: ${OCORRENCIAS[ocorrencia] ?? `ocorrência ${ocorrencia}`}`,
      );
      continue;
    }
    pagamentos.push({
      cobranca: codigo,
      pagoEm: data(campo(linha, DETALHE.data)),
      valorPagoCentavos: Number(campo(linha, DETALHE.valor)),
      tarifaCentavos: Number(campo(linha, DETALHE.tarifa)),
    });
  }

  // O trailer confere o arquivo: um retorno cortado ao meio não pode virar pagamentos
  const quantidade = Number(campo(trailer, TRAILER.quantidade));
  const total = Number(campo(trailer, TRAILER.total));
  const soma = pagamentos.reduce((s, p) => s + p.valorPagoCentavos, 0);
  if (quantidade !== detalhes.length || total !== soma) {
    throw new Error(
      `trailer não confere: ${quantidade} registros e ${total} centavos declarados, ` +
        `${detalhes.length} registros e ${soma} centavos lidos`,
    );
  }
  return { pagamentos, ignoradas };
}
