# O broker (RabbitMQ): uma exchange do tipo fanout entrega cada evento às filas de
# Reservas e de Comunicação. Cada módulo tem a sua fila e consome no seu ritmo.
import json
import os

import pika

FILAS = ["reservas.pagamentos", "comunicacao.pagamentos"]


def conectar_broker():
    conexao = pika.BlockingConnection(pika.URLParameters(os.environ["BROKER_URL"]))
    canal = conexao.channel()
    canal.confirm_delivery()
    canal.exchange_declare("pagamentos", "fanout", durable=True)
    for fila in FILAS:
        canal.queue_declare(fila, durable=True)
        canal.queue_purge(fila)
        canal.queue_bind(fila, "pagamentos")
    return canal, conexao


# Com confirm_delivery, basic_publish só retorna depois que o broker confirma
def publicar(canal, e: dict) -> None:
    canal.basic_publish(
        "pagamentos",
        "",
        json.dumps(e, ensure_ascii=False).encode(),
        pika.BasicProperties(delivery_mode=2, message_id=e["evento"]),
    )


# Consome a fila até esvaziar; a confirmação (ack) vem depois do tratamento
def consumir_tudo(canal, fila: str, tratar) -> None:
    while True:
        metodo, _, corpo = canal.basic_get(fila)
        if metodo is None:
            return
        tratar(json.loads(corpo))
        canal.basic_ack(metodo.delivery_tag)
