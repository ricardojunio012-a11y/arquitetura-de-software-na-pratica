// Chain of Responsibility: cada etapa verifica uma regra e, se o pedido passar,
// entrega para a próxima. O esqueleto de avaliar() é um Template Method.
import type { RepositorioDeReservas } from "./repositorio.ts";
import { diasEntre, type Decisao, type Pedido } from "./tipos.ts";

export abstract class Etapa {
  #proxima: Etapa | null = null;

  // Devolve a próxima etapa, para encadear: a.depois(b).depois(c)
  depois(proxima: Etapa): Etapa {
    this.#proxima = proxima;
    return proxima;
  }

  avaliar(pedido: Pedido): Decisao {
    const motivo = this.verificar(pedido);
    if (motivo) return { aprovada: false, motivo };
    return this.#proxima ? this.#proxima.avaliar(pedido) : { aprovada: true };
  }

  // Cada etapa diz o motivo da recusa, ou null se o pedido passou
  protected abstract verificar(pedido: Pedido): string | null;
}

export class UnidadeEmDia extends Etapa {
  protected verificar(pedido: Pedido): string | null {
    return pedido.unidade.emDebito ? "unidade com débito em aberto" : null;
  }
}

export class AntecedenciaMinima extends Etapa {
  readonly #hoje: Date;

  constructor(hoje: Date) {
    super();
    this.#hoje = hoje;
  }

  protected verificar(pedido: Pedido): string | null {
    const minimo = pedido.espaco.antecedenciaMinimaDias;
    if (diasEntre(this.#hoje, pedido.data) >= minimo) return null;
    return `antecedência mínima de ${minimo} dias`;
  }
}

export class EspacoLivre extends Etapa {
  readonly #reservas: RepositorioDeReservas;

  constructor(reservas: RepositorioDeReservas) {
    super();
    this.#reservas = reservas;
  }

  protected verificar(pedido: Pedido): string | null {
    const ocupado = this.#reservas.ocupado(pedido.espaco.id, pedido.data);
    return ocupado ? "espaço já reservado nesta data" : null;
  }
}

export class LimitePorMes extends Etapa {
  readonly #reservas: RepositorioDeReservas;

  constructor(reservas: RepositorioDeReservas) {
    super();
    this.#reservas = reservas;
  }

  protected verificar(pedido: Pedido): string | null {
    const { unidade, espaco, data } = pedido;
    const feitas = this.#reservas.contarNoMes(unidade.id, espaco.id, data.slice(0, 7));
    return feitas < espaco.limitePorMes ? null : "limite de reservas do mês atingido";
  }
}
