<?php
// Valores sempre em centavos (inteiros), para não perder precisão.
// Arredondamento: meio centavo para cima.
namespace Morada\Cobranca;

final class Dinheiro
{
    public static function parteDe(int $centavos, int $milionesimos): int
    {
        return intdiv($centavos * $milionesimos + 500000, 1000000);
    }

    public static function percentual(int $centavos, int $porcento): int
    {
        return intdiv($centavos * $porcento + 50, 100);
    }

    // 123456 -> "1.234,56"
    public static function reais(int $centavos): string
    {
        return number_format(intdiv($centavos, 100), 0, ',', '.') .
            ',' .
            str_pad((string) ($centavos % 100), 2, '0', STR_PAD_LEFT);
    }
}
