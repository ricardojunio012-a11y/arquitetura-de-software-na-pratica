// Quem reage aos eventos de reserva. Cada um faz uma coisa e não conhece os outros.
import type { Assinante, Evento } from "./eventos.ts";
import type { FabricaDeCanais, Mensagem } from "./notificacao.ts";
import { dataBr, reais } from "./tipos.ts";

export class NotificarMorador implements Assinante {
  readonly nome = "NotificarMorador";
  readonly #fabrica: FabricaDeCanais;

  constructor(fabrica: FabricaDeCanais) {
    this.#fabrica = fabrica;
  }

  tratar({ tipo, pedido, motivo }: Evento): void {
    const quando = `${pedido.espaco.nome} em ${dataBr(pedido.data)}`;
    const mensagem: Mensagem =
      tipo === "ReservaConfirmada"
        ? {
            titulo: "Reserva confirmada",
            texto: `${quando}. Taxa de uso: R$ ${reais(pedido.espaco.taxaCentavos)}.`,
          }
        : { titulo: "Reserva recusada", texto: `${quando}: ${motivo}.` };
    const morador = pedido.unidade.morador;
    this.#fabrica.para(morador).enviar(morador, mensagem);
  }
}

export class LancarTaxaDeUso implements Assinante {
  readonly nome = "LancarTaxaDeUso";
  readonly #taxas: string[];

  constructor(taxas: string[]) {
    this.#taxas = taxas;
  }

  tratar({ pedido }: Evento): void {
    const { unidade, espaco, data } = pedido;
    const descricao = `Taxa de uso: ${espaco.nome} em ${dataBr(data)}`;
    this.#taxas.push(`${unidade.id};${descricao};${reais(espaco.taxaCentavos)}`);
  }
}

export class AvisarPortaria implements Assinante {
  readonly nome = "AvisarPortaria";
  readonly #lista: string[];

  constructor(lista: string[]) {
    this.#lista = lista;
  }

  tratar({ pedido }: Evento): void {
    const { unidade, espaco, data } = pedido;
    this.#lista.push(
      `${dataBr(data)} ${espaco.nome}: ${unidade.id} ${unidade.morador.nome}`,
    );
  }
}
