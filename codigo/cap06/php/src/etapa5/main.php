<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// O main faz toda a entrada e saída; o módulo de reservas não toca em arquivos.
require_once __DIR__ . '/reservas.php';

use function Morada\Etapa5\{avisos, decidir, relatorio};

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$decisoes = decidir(json_decode(file_get_contents($entrada), true), $hoje);

// Aqui entraria o cliente de e-mail de verdade; no laboratório, um arquivo
$emails = array_map(fn($a) => "para {$a[0]}: {$a[1]}", avisos($decisoes));
@mkdir($saida, 0777, true);
file_put_contents("$saida/reservas.txt", implode("\n", relatorio($decisoes)) . "\n");
file_put_contents("$saida/emails.txt", implode("\n", $emails) . "\n");
