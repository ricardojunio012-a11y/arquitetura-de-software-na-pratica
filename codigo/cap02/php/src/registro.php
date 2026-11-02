<?php
// Uso: php registro.php <registro.json>
// Simula a fila de registro em lote e compara o tempo até a confirmação com a meta.
require __DIR__ . '/fila_de_registro.php';

use function Morada\Registro\disponiveisAte;
use function Morada\Registro\percentil;
use function Morada\Registro\simular;

$numero = fn(int $n) => number_format($n, 0, ',', '.');
$porCento = fn(float $n) => number_format($n, 2, ',', '') . '%';

// 10 min | 1 h 36 min | nunca
$duracao = function (int|float|null $segundos): string {
    if ($segundos === null) {
        return 'nunca';
    }
    $minutos = (int) round($segundos / 60);
    $h = intdiv($minutos, 60);
    if ($h === 0) {
        return "$minutos min";
    }
    return $minutos % 60 === 0 ? "$h h" : "$h h " . $minutos % 60 . ' min';
};

$p = json_decode(file_get_contents($argv[1]), true);
echo "{$p['id']}: {$p['descricao']} (semente {$p['semente']})\n";
echo '  premissas: ' .
    $numero($p['boletos']) .
    ' boletos em arquivos de ' .
    $numero($p['boletosPorArquivo']) .
    ', ' .
    $numero($p['registrosPorSegundo']) .
    " por segundo,\n";
echo '  retorno ' .
    $duracao($p['retornoSegundos']) .
    ' depois de cada arquivo, ' .
    $p['falhaPassageiraPorCento'] .
    '% de recusa passageira, 1 em ' .
    $p['recusaDefinitivaACada'] .
    " definitiva\n";
echo '  estimativa por divisão: ' .
    $duracao($p['boletos'] / $p['registrosPorSegundo']) .
    '  meta: todos em até ' .
    $duracao($p['limiteSegundos']) .
    "\n";
$falhas = 0;
foreach ([false, true] as $ajustada) {
    $r = simular($p, $ajustada);
    $dentro = disponiveisAte($r, $p['limiteSegundos']);
    $passou = $dentro === $p['boletos'];
    if (!$passou) {
        $falhas++;
    }
    $pct = fn(int $m) => $duracao(percentil($r, $p['boletos'], $m));
    echo $ajustada ? "ajustada:\n" : "ingênua:\n";
    echo "  arquivos: {$r->arquivos}  tentativas de registro: " .
        $numero($r->tentativas) .
        "\n";
    echo '  disponível em p50: ' .
        $pct(500) .
        '  p95: ' .
        $pct(950) .
        '  p99: ' .
        $pct(990) .
        '  p99,9: ' .
        $pct(999) .
        "\n";
    echo '  última disponível: ' .
        $duracao(max(array_keys($r->disponivelEm))) .
        '  sem registro: ' .
        $numero($r->semRegistro) .
        '  com Pix: ' .
        $numero($r->viaPix) .
        "\n";
    echo '  em até ' .
        $duracao($p['limiteSegundos']) .
        ': ' .
        $numero($dentro) .
        ' (' .
        $porCento((100 * $dentro) / $p['boletos']) .
        ")\n";
    echo '  resultado: ' . ($passou ? 'PASSOU' : 'FALHOU') . "\n";
}
exit($falhas > 0 ? 1 : 0);
