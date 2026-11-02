<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
require __DIR__ . '/cobranca.php';

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje =
    $opcao === '--hoje' ? new DateTimeImmutable($data, new DateTimeZone('UTC')) : null;
Morada\Etapa1\gerarCobrancaMensal($entrada, $saida, $hoje);
echo "cobranças geradas em $saida\n";
