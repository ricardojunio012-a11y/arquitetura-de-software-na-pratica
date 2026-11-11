// O trabalho de um mês de prestações de contas: o lote do dia 1 e os pedidos
// avulsos. Todos os números são premissas do laboratório, com semente fixa.
import { gerador } from "./carga.ts";
import type { Prestacao } from "./funcao/prestacao.ts";
import { executar, type Chamada, type Execucao } from "./plataforma.ts";

export const MIN = 60_000; // ms
const DIA = 24 * 60 * MIN;
export const CONCORRENCIA_LOTE = 50; // protege o banco que a função consulta

// Duração da geração, sem a partida: 150 ms mais 3 ms por unidade
export const duracao = (unidades: number) => 150 + 3 * unidades;

export function mesDePrestacoes(semente = 32) {
  const sorteio = gerador(semente);
  // 3.000 condomínios de 20 a 400 unidades, a maioria pequena
  const unidades = Array.from(
    { length: 3000 },
    () => 20 + Math.floor(sorteio() ** 2 * 380),
  );
  // No dia 1, às 2h, uma mensagem por condomínio entra na fila
  const lote: Chamada[] = unidades.map((u) => ({
    chegada: 2 * 60 * MIN,
    duracao: duracao(u),
  }));
  // 1.500 PDFs refeitos a pedido do síndico, das 8h às 20h, ao longo do mês
  const avulsos: Chamada[] = Array.from({ length: 1500 }, () => ({
    chegada:
      Math.floor(sorteio() * 30) * DIA +
      8 * 60 * MIN +
      Math.floor(sorteio() * 12 * 60 * MIN),
    duracao: duracao(unidades[Math.floor(sorteio() * unidades.length)]),
  }));
  const eLote: Execucao[] = executar(lote, CONCORRENCIA_LOTE);
  const eAvulsos: Execucao[] = executar(avulsos);
  return { unidades, eLote, eAvulsos };
}

// Uma prestação de exemplo, com valores proporcionais ao tamanho do condomínio
export function prestacaoExemplo(i: number, u: number): Prestacao {
  const taxa = u * 61_500; // R$ 615 por unidade
  const parte = (f: number) => -Math.round(taxa * f);
  return {
    condominio: `cond-${String(i + 1).padStart(4, "0")}`,
    competencia: "2026-10",
    lancamentos: [
      { data: "05/10", descricao: "Taxas condominiais recebidas", centavos: taxa },
      { data: "10/10", descricao: "Folha da portaria", centavos: parte(0.42) },
      { data: "15/10", descricao: "Energia das áreas comuns", centavos: parte(0.08) },
      { data: "20/10", descricao: "Manutenção dos elevadores", centavos: parte(0.06) },
      { data: "31/10", descricao: "Fundo de reserva (10%)", centavos: parte(0.1) },
    ],
  };
}
