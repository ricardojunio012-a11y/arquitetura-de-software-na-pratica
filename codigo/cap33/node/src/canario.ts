// O canário: a versão nova atende uma fatia das consultas de valor atualizado, e a
// versão em produção atende o resto. As duas rodam o código de verdade do commit;
// só o tráfego é simulado, com semente fixa.
import { gerador } from "./aleatorio.ts";

export type Cobranca = { valor: number; vencimento: string };
export type Modulo = { valorAtualizado(c: Cobranca, pagamento: string): unknown };
export type Consulta = { cobranca: Cobranca; dia: string };
export type Contagem = { pedidos: number; erros: number; mensagem?: string };

const dia = (base: string, mais: number) =>
  new Date(Date.parse(base) + mais * 86_400_000).toISOString().slice(0, 10);

// Consultas de um dia de produção: taxas de novembro e dezembro de 2026 e, em 3%
// delas, parcelas de acordos de inadimplência que vencem no primeiro semestre de 2027
export function trafego(quantas: number, semente: number): Consulta[] {
  const sorteio = gerador(semente);
  const consultas: Consulta[] = [];
  for (let i = 0; i < quantas; i++) {
    const valor = 30_000 + Math.floor(sorteio() * 90_000);
    const acordo = sorteio() < 0.03;
    const mes = acordo ? 1 + Math.floor(sorteio() * 6) : 11 + Math.floor(sorteio() * 2);
    const ano = acordo ? 2027 : 2026;
    const vencimento = `${ano}-${String(mes).padStart(2, "0")}-05`;
    consultas.push({ cobranca: { valor, vencimento }, dia: dia("2026-10-27", i % 30) });
  }
  return consultas;
}

async function atender(modulo: Modulo, consulta: Consulta, conta: Contagem) {
  conta.pedidos++;
  try {
    await modulo.valorAtualizado(consulta.cobranca, consulta.dia);
  } catch (erro) {
    conta.erros++;
    conta.mensagem ??= (erro as Error).message;
  }
}

// Reprova a versão nova se a taxa de erros dela passar a da produção em mais de
// 0,5 ponto percentual
export async function canario(nova: Modulo, atual: Modulo, consultas: Consulta[]) {
  const fatia = gerador(33);
  const canario: Contagem = { pedidos: 0, erros: 0 };
  const producao: Contagem = { pedidos: 0, erros: 0 };
  for (const consulta of consultas) {
    if (fatia() < 0.05) await atender(nova, consulta, canario);
    else await atender(atual, consulta, producao);
  }
  const taxa = (c: Contagem) => (c.pedidos ? c.erros / c.pedidos : 0);
  const aprovado = taxa(canario) - taxa(producao) <= 0.005;
  return { canario, producao, aprovado };
}
