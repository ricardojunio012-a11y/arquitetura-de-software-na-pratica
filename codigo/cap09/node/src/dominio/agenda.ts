// O centro do hexágono: as regras de reserva. Não importa nada de fora do domínio.
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
  readonly #reservas: Reserva[];

  // Um repositório que carrega uma agenda salva passa as reservas existentes
  constructor(espaco: Espaco, reservas: Reserva[] = []) {
    this.espaco = espaco;
    this.#reservas = [...reservas];
  }

  reservar(
    id: string,
    unidade: string,
    data: string,
    inicio: number,
    fim: number,
    hoje: string,
  ): Reserva {
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
    const [r] = this.#reservas.splice(i, 1);
    return dias(hoje, r.data) < 2 ? Math.floor((r.taxaCentavos * 50 + 50) / 100) : 0;
  }

  // Em ordem de data e horário, qualquer que seja a ordem em que foram guardadas
  reservas(): Reserva[] {
    return [...this.#reservas].sort(
      (a, b) => a.data.localeCompare(b.data) || a.inicio - b.inicio,
    );
  }
}
