// Os dados das reservas e funções pequenas de datas e dinheiro.
export interface Espaco {
  id: string;
  nome: string;
  taxaCentavos: number;
  antecedenciaMinimaDias: number;
  limitePorMes: number;
}

export interface Morador {
  nome: string;
  email: string;
  telefone?: string;
  canal: string;
}

export interface Unidade {
  id: string;
  emDebito: boolean;
  morador: Morador;
}

export interface Pedido {
  id: string;
  unidade: Unidade;
  espaco: Espaco;
  data: string;
}

export interface Decisao {
  aprovada: boolean;
  motivo?: string;
}

export function diasEntre(hoje: Date, dataIso: string): number {
  return Math.round((Date.parse(dataIso + "T00:00:00Z") - hoje.getTime()) / 86400000);
}

// 2026-03-14 -> 14/03/2026
export function dataBr(dataIso: string): string {
  return dataIso.split("-").reverse().join("/");
}

export function reais(c: number): string {
  return Math.floor(c / 100) + "," + String(c % 100).padStart(2, "0");
}
