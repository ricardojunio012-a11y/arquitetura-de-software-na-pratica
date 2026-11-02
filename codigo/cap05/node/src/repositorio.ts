// Repository: quem usa as reservas não sabe onde elas ficam guardadas.
import type { Reserva } from "./estado.ts";

export interface RepositorioDeReservas {
  salvar(reserva: Reserva): void;
  // Verifica e grava numa operação só: no banco, uma restrição de unicidade
  salvarSeLivre(reserva: Reserva): boolean;
  buscar(id: string): Reserva | undefined;
  ocupado(espaco: string, data: string): boolean;
  contarNoMes(unidade: string, espaco: string, mes: string): number;
}

// Em memória para o laboratório; o capítulo 16 troca por um banco de dados.
// Guarda todas as reservas; as consultas só contam as aprovadas.
export class RepositorioEmMemoria implements RepositorioDeReservas {
  readonly #reservas: Reserva[] = [];

  salvar(reserva: Reserva): void {
    this.#reservas.push(reserva);
  }

  salvarSeLivre(reserva: Reserva): boolean {
    const { espaco, data } = reserva.pedido;
    if (this.ocupado(espaco.id, data)) return false;
    this.salvar(reserva);
    return true;
  }

  buscar(id: string): Reserva | undefined {
    return this.#reservas.find((r) => r.pedido.id === id);
  }

  ocupado(espaco: string, data: string): boolean {
    return this.#aprovadas().some(
      ({ pedido: p }) => p.espaco.id === espaco && p.data === data,
    );
  }

  contarNoMes(unidade: string, espaco: string, mes: string): number {
    return this.#aprovadas().filter(
      ({ pedido: p }) =>
        p.unidade.id === unidade && p.espaco.id === espaco && p.data.startsWith(mes),
    ).length;
  }

  #aprovadas(): Reserva[] {
    return this.#reservas.filter((r) => r.estado === "aprovada");
  }
}
