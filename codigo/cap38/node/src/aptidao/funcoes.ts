// As funções de aptidão da esteira, cada uma ligada ao ADR que protege
import type { PGlite } from "@electric-sql/pglite";
import { dadosProprios } from "./dados-proprios.ts";
import { latenciaDoPainel, META } from "./latencia.ts";

export type Resultado = { ok: boolean; detalhes: string[] };
export type Funcao = {
  nome: string;
  adr: number;
  regra: string;
  verificar: (pasta: string, pg: PGlite) => Promise<Resultado>;
};

const ms = (n: number) => `${Math.round(n)} ms`;

export const FUNCOES: Funcao[] = [
  {
    nome: "dados-proprios",
    adr: 10,
    regra: "nenhum módulo lê nem grava a tabela de outro",
    async verificar(pasta) {
      const violacoes = dadosProprios(pasta);
      return { ok: violacoes.length === 0, detalhes: violacoes };
    },
  },
  {
    nome: "latencia-painel",
    adr: 38,
    regra:
      `p95 do painel abaixo de ${META.p95Ms} ms` +
      ` a ${META.pedidosPorSegundo} pedidos/s`,
    async verificar(pasta, pg) {
      const r = await latenciaDoPainel(pg, pasta);
      const consultas = r.consultasPorPedido.toFixed(1).replace(".", ",");
      return {
        ok: r.p95 < META.p95Ms,
        detalhes: [
          `p50 ${ms(r.p50)}, p95 ${ms(r.p95)}; ${consultas} consultas por pedido` +
            ` (até ${r.maiorPerfil})`,
        ],
      };
    },
  },
];
