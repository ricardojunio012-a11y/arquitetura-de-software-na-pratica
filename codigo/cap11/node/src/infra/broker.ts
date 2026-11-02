// O broker (RabbitMQ): uma exchange do tipo fanout entrega cada evento às filas de
// Reservas e de Comunicação. Cada módulo tem a sua fila e consome no seu ritmo.
import amqp from "amqplib";
import type { PagamentoConfirmado } from "../eventos.ts";

export const FILAS = ["reservas.pagamentos", "comunicacao.pagamentos"];

export async function conectarBroker() {
  const conexao = await amqp.connect(process.env.BROKER_URL!);
  const canal = await conexao.createConfirmChannel();
  await canal.assertExchange("pagamentos", "fanout", { durable: true });
  for (const fila of FILAS) {
    await canal.assertQueue(fila, { durable: true });
    await canal.purgeQueue(fila);
    await canal.bindQueue(fila, "pagamentos", "");
  }
  return { canal, fechar: () => conexao.close() };
}

// Só considera publicado depois que o broker confirma o recebimento
export async function publicar(canal: amqp.ConfirmChannel, e: PagamentoConfirmado) {
  canal.publish("pagamentos", "", Buffer.from(JSON.stringify(e)), {
    persistent: true,
    messageId: e.evento,
  });
  await canal.waitForConfirms();
}

// Consome a fila até esvaziar; a confirmação (ack) vem depois do tratamento
export async function consumirTudo(
  canal: amqp.ConfirmChannel,
  fila: string,
  tratar: (e: PagamentoConfirmado) => void,
) {
  for (;;) {
    const mensagem = await canal.get(fila);
    if (!mensagem) return;
    tratar(JSON.parse(mensagem.content.toString()));
    canal.ack(mensagem);
  }
}
