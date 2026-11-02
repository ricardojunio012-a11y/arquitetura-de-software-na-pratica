<?php
// Aberta para extensão, fechada para modificação: uma regra nova é uma classe nova,
// entregue pelo construtor. Esta classe não muda.
namespace Morada\Depois\Cobranca;

require_once __DIR__ . '/cobranca.php';

final class CalculadoraDeCobranca
{
    /** @param Regra[] $regras */
    public function __construct(private readonly array $regras) {}

    public function calcular(array $unidade): Cobranca
    {
        $lancados = [];
        foreach ($this->regras as $regra) {
            array_push($lancados, ...$regra->aplicar($unidade, $lancados));
        }
        return new Cobranca($unidade['id'], $unidade['morador']['nome'], $lancados);
    }
}
