<?php
// Uso: php main.php <cenarios.json>
// Roda cada cenário, imprime o relatório e termina com erro se algum falhar.
require __DIR__ . '/cenarios.php';

use function Morada\executar;

$numero = fn(float $n) => number_format(round($n), 0, ',', '.');
$decimal = fn(float $n, int $casas) => number_format($n, $casas, ',', '');

// 2,25 s | 4 min | 6 h 40 min
$duracao = function (float $segundos) use ($decimal): string {
    if ($segundos < 60) {
        return $decimal($segundos, 2) . ' s';
    }
    $minutos = (int) round($segundos / 60);
    $h = intdiv($minutos, 60);
    if ($h === 0) {
        return "$minutos min";
    }
    return $minutos % 60 === 0 ? "$h h" : "$h h " . $minutos % 60 . ' min';
};

$cenarios = json_decode(file_get_contents($argv[1]), true);
$hoje = new DateTimeImmutable('2026-03-02', new DateTimeZone('UTC'));
$falhas = 0;

foreach ($cenarios as $c) {
    $r = executar($c, $hoje);
    if (!$r->passou) {
        $falhas++;
    }
    $vazao = $r->cobrancas / $r->segundosCalculo;
    echo "{$c['id']}: {$c['descricao']}\n";
    echo '  cobranças: ' .
        $numero($r->cobrancas) .
        '  meta: até ' .
        $duracao($c['limiteSegundos']) .
        "\n";
    echo '  cálculo (medido): ' .
        $duracao($r->segundosCalculo) .
        ', ' .
        $numero($vazao) .
        " por segundo\n";
    echo "  registro no banco (estimado, {$c['registrosPorSegundo']}/s): " .
        $duracao($r->segundosRegistro) .
        "\n";
    echo '  avisos: ' .
        $decimal($r->bytesAvisos / 1e6, 1) .
        ' MB, ' .
        $numero($r->bytesAvisos / $r->cobrancas) .
        " bytes por aviso\n";
    echo '  resultado: ' . ($r->passou ? 'PASSOU' : 'FALHOU') . "\n";
}
echo count($cenarios) -
    $falhas .
    ' de ' .
    count($cenarios) .
    " cenários dentro da meta.\n";
exit($falhas > 0 ? 1 : 0);
