<?php
// Uso: php main.php <cobrancas.json> <pasta-de-plugins> <pasta-de-saída>
require_once __DIR__ . '/nucleo.php';

use Morada\Plugins\{Cobranca, Nucleo};

[, $entrada, $pastaDePlugins, $saida] = $argv;
$nucleo = new Nucleo();
$nucleo->carregar($pastaDePlugins);

$dados = json_decode(file_get_contents($entrada), true);
$linhas = ['plugins carregados: ' . implode(', ', $nucleo->nomes())];
foreach ($dados['cobrancas'] as $c) {
    $linhas[] = $nucleo->emitir(
        new Cobranca($c['unidade'], $c['valorCentavos'], $c['banco']),
    );
}

@mkdir($saida, 0777, true);
file_put_contents("$saida/remessa.txt", implode("\n", $linhas) . "\n");
echo count($dados['cobrancas']) . " cobranças; saída em $saida\n";
