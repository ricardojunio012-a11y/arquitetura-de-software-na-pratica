<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/servicos/servicos.php';

use Morada\Antes\Config\Config;
use Morada\Antes\Servicos\Servicos;

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
Config::$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
Config::$dados = json_decode(file_get_contents($entrada), true);
Servicos::calcularTodas();

// A ordem importa: a inadimplência reordena a lista de cobranças
if (!is_dir($saida)) {
    mkdir($saida, 0777, true);
}
foreach (['cobrancas', 'inadimplencia', 'prestacao'] as $tipo) {
    file_put_contents("$saida/$tipo.txt", Servicos::gerarSaida($tipo));
}
echo "relatórios gerados em $saida\n";
