// Recebe o pedido, consulta a cadeia de aprovação, guarda e anuncia o resultado.
import type { Etapa } from "./aprovacao.ts";
import { Reserva } from "./estado.ts";
import type { Barramento } from "./eventos.ts";
import type { RepositorioDeReservas } from "./repositorio.ts";
import type { Decisao, Pedido } from "./tipos.ts";

export class ServicoDeReservas {
  readonly #aprovacao: Etapa;
  readonly #reservas: RepositorioDeReservas;
  readonly #eventos: Barramento;

  constructor(aprovacao: Etapa, reservas: RepositorioDeReservas, eventos: Barramento) {
    this.#aprovacao = aprovacao;
    this.#reservas = reservas;
    this.#eventos = eventos;
  }

  solicitar(pedido: Pedido): Decisao {
    const reserva = new Reserva(pedido);
    let decisao = this.#aprovacao.avaliar(pedido);
    // A cadeia viu o espaço livre, mas outro pedido pode ter gravado depois:
    // a gravação confere de novo, numa operação só (passo 6 do laboratório)
    if (decisao.aprovada && !this.#reservas.salvarSeLivre(reserva)) {
      decisao = { aprovada: false, motivo: "espaço já reservado nesta data" };
    }
    if (decisao.aprovada) {
      reserva.aprovar();
    } else {
      reserva.recusar();
      this.#reservas.salvar(reserva);
    }
    const tipo = decisao.aprovada ? "ReservaConfirmada" : "ReservaRecusada";
    this.#eventos.publicar({ tipo, pedido, motivo: decisao.motivo });
    return decisao;
  }

  // O estado decide se a reserva pode ser cancelada
  cancelar(id: string): string {
    const reserva = this.#reservas.buscar(id);
    if (!reserva) throw new Error(`reserva ${id} não encontrada`);
    const antes = reserva.estado;
    reserva.cancelar();
    return `${antes} -> ${reserva.estado}`;
  }
}
