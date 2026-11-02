// Camada de domínio: as regras de reserva. Não conhece HTTP, JSON nem banco de dados.
export class RegraVioladaErro extends Error {}
export class NaoEncontradoErro extends Error {}

export function reais(centavos: number): string {
  const inteiro = String(Math.floor(centavos / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return `R$ ${inteiro},${String(centavos % 100).padStart(2, "0")}`;
}

export interface Espaco {
  id: string;
  taxaCentavos: number;
  antecedenciaMinimaDias: number;
}

export interface Reserva {
  readonly id: string;
  readonly unidade: string;
  readonly data: string;
  readonly inicio: number;
  readonly fim: number;
  readonly taxaCentavos: number;
}

const dias = (de: string, ate: string) =>
  Math.round((Date.parse(ate) - Date.parse(de)) / 86400000);

export class Agenda {
  readonly espaco: Espaco;
  readonly #reservas: Reserva[] = [];

  constructor(espaco: Espaco) {
    this.espaco = espaco;
  }

  reservar(
    id: string,
    unidade: string,
    data: string,
    inicio: number,
    fim: number,
    hoje: string,
  ) {
    if (fim <= inicio) throw new RegraVioladaErro("período inválido");
    if (dias(hoje, data) < this.espaco.antecedenciaMinimaDias) {
      throw new RegraVioladaErro("antecedência mínima não respeitada");
    }
    const conflito = this.#reservas.find(
      (r) => r.data === data && r.inicio < fim && inicio < r.fim,
    );
    if (conflito) throw new RegraVioladaErro(`horário sobreposto a ${conflito.id}`);
    const diaDaSemana = new Date(data + "T00:00:00Z").getUTCDay();
    const base = this.espaco.taxaCentavos;
    const fimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;
    const taxa = fimDeSemana ? base + Math.floor((base * 20 + 50) / 100) : base;
    const reserva = { id, unidade, data, inicio, fim, taxaCentavos: taxa };
    this.#reservas.push(reserva);
    return reserva;
  }

  // Devolve a multa em centavos: 50% da taxa se faltar menos de 2 dias
  cancelar(id: string, hoje: string): number {
    const i = this.#reservas.findIndex((r) => r.id === id);
    if (i < 0) throw new NaoEncontradoErro("reserva não encontrada");
    const [reserva] = this.#reservas.splice(i, 1);
    return dias(hoje, reserva.data) < 2
      ? Math.floor((reserva.taxaCentavos * 50 + 50) / 100)
      : 0;
  }

  tem(id: string): boolean {
    return this.#reservas.some((r) => r.id === id);
  }

  reservas(): readonly Reserva[] {
    return [...this.#reservas];
  }
}
