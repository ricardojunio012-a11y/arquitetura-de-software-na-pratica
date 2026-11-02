// Dado privado de Reservas: um espaço, uma reserva por dia (simplificado).
export class Agenda {
  readonly #espacos: Set<string>;
  readonly #ocupacao = new Map<string, string>();

  constructor(espacos: string[]) {
    this.#espacos = new Set(espacos);
  }

  ocupante(espaco: string, data: string): string | undefined {
    if (!this.#espacos.has(espaco)) throw new Error(`espaço ${espaco} não existe`);
    return this.#ocupacao.get(`${espaco} ${data}`);
  }

  registrar(reserva: string, espaco: string, data: string) {
    this.#ocupacao.set(`${espaco} ${data}`, reserva);
  }
}
