<?php
// Utilidades diversas: o que não coube em outro lugar (coesão por coincidência).
namespace Morada\Antes\Util;

require_once __DIR__ . '/../config/config.php';

use Morada\Antes\Config\Config;

function reais(int $c): string
{
    return number_format(intdiv($c, 100), 0, ',', '.') .
        ',' .
        str_pad((string) ($c % 100), 2, '0', STR_PAD_LEFT);
}

// Depende, sem avisar, da data guardada na configuração global
function diasDeAtraso(string $vencimento): int
{
    return (new \DateTimeImmutable($vencimento))->diff(Config::$hoje)->days;
}

function competencia(): string
{
    return Config::$hoje->format('m/Y');
}
