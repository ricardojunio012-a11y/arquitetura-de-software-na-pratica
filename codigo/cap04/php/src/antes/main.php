<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// O gateway está fixo no código: a variável GATEWAY não muda nada aqui.
require_once __DIR__ . '/emissao.php';

use function Morada\Antes\emitirCobrancas;

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$dados = json_decode(file_get_contents($entrada), true);
[$cobrancas, $registros] = emitirCobrancas($dados, $hoje);
@mkdir($saida, 0777, true);
file_put_contents("$saida/cobrancas.txt", $cobrancas);
file_put_contents("$saida/registros.txt", $registros);
echo "cobranças emitidas em $saida\n";
