// O back-end do Morada (o monólito): Portaria cuida das encomendas e dos visitantes;
// Reservas sabe quem são os convidados de cada festa. Nenhum dos dois conhece telas.
export interface Encomenda {
  encomenda: string;
  unidade: string;
  situacao: "na portaria" | "entregue" | "devolvida";
  versao: number;
  por?: string;
  hora?: string;
}

export interface Visitante {
  nome: string;
  reserva: string;
  tablet: string;
  hora: string;
}

export interface Convidado {
  nome: string;
  reserva: string;
  espaco: string;
}

export class Portaria {
  readonly encomendas = new Map<string, Encomenda>();
  readonly visitantes: Visitante[] = [];

  constructor(encomendas: { encomenda: string; unidade: string }[]) {
    for (const e of encomendas) {
      this.encomendas.set(e.encomenda, { ...e, situacao: "na portaria", versao: 1 });
    }
  }

  // Concorrência otimista: muda só se ninguém mudou desde a versão vista
  mudar(
    id: string,
    situacao: "entregue" | "devolvida",
    versaoVista: number,
    tablet: string,
    hora: string,
  ): string {
    const e = this.encomendas.get(id)!;
    if (e.versao !== versaoVista) {
      return `conflito: ${id} já ${e.situacao} pelo tablet ${e.por} às ${e.hora}`;
    }
    Object.assign(e, { situacao, versao: e.versao + 1, por: tablet, hora });
    return "aplicada";
  }

  registrarVisitante(nome: string, reserva: string, tablet: string, hora: string) {
    this.visitantes.push({ nome, reserva, tablet, hora });
    return "aplicada";
  }
}

export class Reservas {
  readonly #convidados: Convidado[] = [];

  constructor(festas: { reserva: string; espaco: string; nomes: string[] }[]) {
    for (const f of festas) {
      for (const nome of f.nomes) {
        this.#convidados.push({ nome, reserva: f.reserva, espaco: f.espaco });
      }
    }
  }

  convidados(): Convidado[] {
    return [...this.#convidados];
  }
}
