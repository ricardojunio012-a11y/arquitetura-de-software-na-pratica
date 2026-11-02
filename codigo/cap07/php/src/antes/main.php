<?php
// Uso: php main.php <comandos.json> <pasta-de-saída>
require_once __DIR__ . '/servico.php';

use Morada\Antes\Reservas;
use function Morada\Antes\{cancelar, reservar};

[, $entrada, $saida] = $argv;
$dados = json_decode(file_get_contents($entrada), true);
$espacos = array_column($dados['espacos'], null, 'id');
$eventos = [];
$resultados = [];
foreach ($dados['comandos'] as $c) {
    $r =
        $c['tipo'] === 'reservar'
            ? reservar($c, $espacos[$c['espaco']], $eventos)
            : cancelar($c, $eventos);
    $resultados[] = "{$c['reserva']};{$c['tipo']};$r";
}
$agenda = [];
foreach ($dados['espacos'] as $e) {
    foreach (Reservas::$todas as $r) {
        if ($r->espaco === $e['id'] && $r->situacao === 'confirmada') {
            $periodo = "{$r->data} {$r->inicio}h-{$r->fim}h";
            $agenda[] = "{$r->espaco};{$r->id};$periodo;{$r->unidade}";
        }
    }
}

@mkdir($saida, 0777, true);
foreach (
    ['resultados' => $resultados, 'eventos' => $eventos, 'agenda' => $agenda]
    as $n => $l
) {
    file_put_contents("$saida/$n.txt", implode("\n", $l) . "\n");
}
echo count($resultados) . " comandos executados; saída em $saida\n";
