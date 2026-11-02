<?php
// Valores em centavos e arredondamento meio para cima. Não depende de nenhum módulo.
namespace Morada\Depois\Compartilhado;

function parteDe(int $centavos, int $milionesimos): int
{
    return intdiv($centavos * $milionesimos + 500000, 1000000);
}

function percentual(int $centavos, int $porcento): int
{
    return intdiv($centavos * $porcento + 50, 100);
}

function reais(int $c): string
{
    return number_format(intdiv($c, 100), 0, ',', '.') .
        ',' .
        str_pad((string) ($c % 100), 2, '0', STR_PAD_LEFT);
}
