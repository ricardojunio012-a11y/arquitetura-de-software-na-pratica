// Objeto de valor: um período de uso num dia. O fim nunca vem antes do início.
import { ErroDeDominio } from "./erro.ts";

export class Periodo {
  readonly data: string;
  readonly inicio: number;
  readonly fim: number;

  constructor(data: string, inicio: number, fim: number) {
    if (fim <= inicio) {
      throw new ErroDeDominio("período inválido: o fim deve ser depois do início");
    }
    this.data = data;
    this.inicio = inicio;
    this.fim = fim;
  }

  sobrepoe(outro: Periodo): boolean {
    return (
      this.data === outro.data && this.inicio < outro.fim && outro.inicio < this.fim
    );
  }

  mes(): string {
    return this.data.slice(0, 7);
  }

  diasDesde(dia: string): number {
    return Math.round((Date.parse(this.data) - Date.parse(dia)) / 86400000);
  }

  ehFimDeSemana(): boolean {
    const diaDaSemana = new Date(this.data + "T00:00:00Z").getUTCDay();
    return diaDaSemana === 0 || diaDaSemana === 6;
  }

  toString(): string {
    return `${this.data} ${this.inicio}h-${this.fim}h`;
  }
}
