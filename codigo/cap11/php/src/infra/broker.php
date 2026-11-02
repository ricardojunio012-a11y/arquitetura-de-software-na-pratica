<?php
// O broker (RabbitMQ): uma exchange do tipo fanout entrega cada evento às filas de
// Reservas e de Comunicação. Cada módulo tem a sua fila e consome no seu ritmo.
namespace Morada\Infra;

use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

const FILAS = ['reservas.pagamentos', 'comunicacao.pagamentos'];

function conectarBroker(): array
{
    $u = parse_url(getenv('BROKER_URL'));
    $conexao = new AMQPStreamConnection($u['host'], $u['port'], $u['user'], $u['pass']);
    $canal = $conexao->channel();
    $canal->confirm_select();
    $canal->exchange_declare('pagamentos', 'fanout', false, true, false);
    foreach (FILAS as $fila) {
        $canal->queue_declare($fila, false, true, false, false);
        $canal->queue_purge($fila);
        $canal->queue_bind($fila, 'pagamentos');
    }
    return [$canal, $conexao];
}

// Só considera publicado depois que o broker confirma o recebimento
function publicar(AMQPChannel $canal, array $e): void
{
    $mensagem = new AMQPMessage(json_encode($e, JSON_UNESCAPED_UNICODE), [
        'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
        'message_id' => $e['evento'],
    ]);
    $canal->basic_publish($mensagem, 'pagamentos');
    $canal->wait_for_pending_acks();
}

// Consome a fila até esvaziar; a confirmação (ack) vem depois do tratamento
function consumirTudo(AMQPChannel $canal, string $fila, callable $tratar): void
{
    while (($mensagem = $canal->basic_get($fila)) !== null) {
        $tratar(json_decode($mensagem->getBody(), true));
        $mensagem->ack();
    }
}
