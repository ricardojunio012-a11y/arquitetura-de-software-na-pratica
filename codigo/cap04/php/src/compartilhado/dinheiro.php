<?php
// Valores em centavos e arredondamento meio para cima.
namespace Morada\Compartilhado;

function parteDe(int $centavos, int $milionesimos): int
{
    return intdiv($centavos * $milionesimos + 500000, 1000000);
}

function percentual(int $centavos, int $porcento): int
{
    return intdiv($centavos * $porcento + 50, 100);
}

// 1.352,18 (formato brasileiro, com sinal quando negativo)
function reais(int $c): string
{
    $a = abs($c);
    $inteiro = number_format(intdiv($a, 100), 0, ',', '.');
    return ($c < 0 ? '-' : '') . $inteiro . ',' . sprintf('%02d', $a % 100);
}

// 1352.18 (formato pedido pela API do Banco Alfa)
function reaisComPonto(int $c): string
{
    return intdiv($c, 100) . '.' . sprintf('%02d', $c % 100);
}
