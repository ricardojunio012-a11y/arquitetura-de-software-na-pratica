<?php
// A versão "barulho": um servidor atende um pedido por vez, em ordem de chegada, e
// cada pedido leva servicoMs. Sem limite, a rajada de um condomínio enche a fila e
// atrasa todos. Com um balde de fichas por condomínio, a rajada é recusada (429) e os
// outros quase não esperam. O tempo é simulado, e o resultado é sempre o mesmo.
require_once __DIR__ . '/balde.php';

use Morada\BaldeDeFichas;

$dados = $argv[1];
$cenario = json_decode(file_get_contents("$dados/entrada/barulho.json"), true);

$pedidos = [];
foreach ($cenario['clientes'] as $c) {
    for ($t = $c['inicioMs']; $t < $cenario['duracaoMs']; $t += $c['intervaloMs']) {
        $pedidos[] = [$t, $c['condominio']];
    }
}
sort($pedidos);

function simular(array $pedidos, int $servicoMs, ?array $limite): array
{
    $recusados = [];
    $esperas = [];
    $baldes = [];
    $livreEm = 0;
    foreach ($pedidos as [$t, $condominio]) {
        $recusados[$condominio] ??= 0;
        $esperas[$condominio] ??= [];
        if ($limite) {
            $baldes[$condominio] ??= new BaldeDeFichas(
                $limite['rajada'],
                $limite['porSegundo'],
            );
            if (!$baldes[$condominio]->permite($t)) {
                $recusados[$condominio]++;
                continue;
            }
        }
        // O pedido espera o servidor terminar o que chegou antes dele
        $inicio = max($t, $livreEm);
        $esperas[$condominio][] = $inicio - $t;
        $livreEm = $inicio + $servicoMs;
    }
    ksort($esperas);
    $linhas = [];
    foreach ($esperas as $condominio => $lista) {
        $media = $lista ? intdiv(array_sum($lista), count($lista)) : 0;
        $maxima = $lista ? max($lista) : 0;
        $total = count($lista) + $recusados[$condominio];
        $linhas[] =
            "condomínio $condominio: $total pedidos, " .
            count($lista) .
            " atendidos, {$recusados[$condominio]} recusados, " .
            "espera média $media ms, máxima $maxima ms";
    }
    return $linhas;
}

$limite = $cenario['limite'];
$resultado = [
    '== sem limite',
    ...simular($pedidos, $cenario['servicoMs'], null),
    '',
    "== com limite por condomínio (rajada de {$limite['rajada']}, " .
    "{$limite['porSegundo']} por segundo)",
    ...simular($pedidos, $cenario['servicoMs'], $limite),
];

$saida = "$dados/saida/barulho";
@mkdir($saida, 0777, true);
file_put_contents("$saida/resultado.txt", implode("\n", $resultado) . "\n");
echo 'barulho: ' . count($pedidos) . " pedidos simulados\n";
