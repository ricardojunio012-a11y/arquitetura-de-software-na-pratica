<?php
// Uma saída do fundo, num processo próprio, para o teste de concorrência.
// Uso: php saida_concorrente.php <valor em centavos> <descrição>
require_once __DIR__ . '/../src/banco.php';
require_once __DIR__ . '/../src/fundo.php';

use function Morada\{conectar, registrarSaida};

$registrada = registrarSaida(
    conectar(getenv('BANCO_URL')),
    1,
    (int) $argv[1],
    $argv[2],
);
echo $registrada ? 'registrada' : 'recusada';
