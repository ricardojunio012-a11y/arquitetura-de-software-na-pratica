<?php
// Uso: php main.php memoria|escrita-dupla|outbox <pasta-de-saída>
// O Financeiro confirma três pagamentos; Reservas e Comunicação reagem ao evento.
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/eventos.php';
require_once __DIR__ . '/modulos/reservas.php';
require_once __DIR__ . '/modulos/comunicacao.php';
require_once __DIR__ . '/infra/banco.php';
require_once __DIR__ . '/infra/broker.php';

use Morada\Modulos\{Comunicacao, Reservas};
use PhpAmqpLib\Channel\AMQPChannel;

use function Morada\eventoDe;
use function Morada\Infra\{conectarBanco, conectarBroker, consumirTudo};
use function Morada\Infra\{gravarComOutbox, gravarPagamento, publicar};

[, $versao, $saida] = $argv;
$cenario = json_decode(file_get_contents('/dados/entrada/cenario.json'), true);
$reservas = new Reservas($cenario['reservas']);
$comunicacao = new Comunicacao();
$execucao = [];

// Barramento em memória: os assinantes rodam na hora, no mesmo processo
function rodarEmMemoria(array $pagamentos, array $assinantes, array &$execucao): void
{
    foreach ($pagamentos as $p) {
        $e = eventoDe($p);
        $execucao[] =
            "{$p['pagamento']} confirmado; " . "{$e['evento']} entregue em memória";
        foreach ($assinantes as $assinante) {
            $assinante($e);
        }
    }
}

// O relay lê a outbox e publica o que falta; só marca como publicado depois
function rodarRelay(
    PDO $banco,
    AMQPChannel $canal,
    array &$caiAntes,
    array &$execucao,
): void {
    $linhas = $banco
        ->query(
            'SELECT id, evento, conteudo FROM outbox WHERE NOT publicado ORDER BY id',
        )
        ->fetchAll(PDO::FETCH_ASSOC);
    foreach ($linhas as $l) {
        publicar($canal, json_decode($l['conteudo'], true));
        if (isset($caiAntes[$l['evento']])) {
            unset($caiAntes[$l['evento']]);
            $execucao[] = "relay publicou {$l['evento']} e caiu antes de marcar";
            return;
        }
        $banco
            ->prepare('UPDATE outbox SET publicado = true WHERE id = ?')
            ->execute([$l['id']]);
        $execucao[] = "relay publicou {$l['evento']}";
    }
}

$aoPagar = [
    fn($e) => $reservas->aoConfirmarPagamento($e),
    fn($e) => $comunicacao->aoConfirmarPagamento($e),
];
if ($versao === 'memoria') {
    rodarEmMemoria($cenario['pagamentos'], $aoPagar, $execucao);
} else {
    $comOutbox = $versao === 'outbox';
    $banco = conectarBanco();
    [$canal, $conexao] = conectarBroker();
    foreach ($cenario['pagamentos'] as $p) {
        $e = eventoDe($p);
        if ($comOutbox) {
            gravarComOutbox($banco, $p, $e);
            $execucao[] = "{$p['pagamento']} gravado com {$e['evento']} na outbox";
            continue;
        }
        // Escrita dupla: grava no banco e depois publica, em dois passos separados
        gravarPagamento($banco, $p);
        if (($p['falha'] ?? '') === 'depois-de-gravar') {
            $execucao[] =
                "{$p['pagamento']} gravado; " . 'o processo caiu antes de publicar';
            continue;
        }
        publicar($canal, $e);
        $execucao[] = "{$p['pagamento']} gravado; {$e['evento']} publicado";
    }
    if ($comOutbox) {
        $caiAntes = [];
        foreach ($cenario['pagamentos'] as $p) {
            if (($p['falha'] ?? '') === 'relay-antes-de-marcar') {
                $caiAntes["E-{$p['pagamento']}"] = true;
            }
        }
        rodarRelay($banco, $canal, $caiAntes, $execucao);
        rodarRelay($banco, $canal, $caiAntes, $execucao);
    }
    consumirTudo($canal, 'reservas.pagamentos', $aoPagar[0]);
    consumirTudo($canal, 'comunicacao.pagamentos', $aoPagar[1]);
    $canal->close();
    $conexao->close();
}

@mkdir($saida, 0777, true);
$gravar = fn($nome, $linhas) => file_put_contents(
    "$saida/$nome",
    implode("\n", $linhas) . "\n",
);
$gravar('execucao.txt', $execucao);
$gravar('consumo.txt', [...$reservas->registro, ...$comunicacao->registro]);
$gravar('resultado.txt', [...$reservas->linhas(), ...$comunicacao->avisos]);
echo "$versao: saída em $saida\n";
