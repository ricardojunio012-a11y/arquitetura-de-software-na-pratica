<?php
namespace Morada\Depois\Cobranca\Regras;

require_once __DIR__ . '/../tipos.php';
require_once __DIR__ . '/../../../compartilhado/datas.php';
require_once __DIR__ . '/../../../compartilhado/dinheiro.php';

use Morada\Depois\Cobranca\{Lancamento, Regra};
use function Morada\Compartilhado\{diaMes, percentual};
use function Morada\Depois\Cobranca\valorDe;

// Desconto sobre a taxa devida para quem pagar até o dia combinado.
// Quem tem débito anterior não tem desconto (a regra do capítulo 1).
final class DescontoAntecipado implements Regra
{
    public function __construct(
        private readonly int $porcento,
        private readonly string $ate,
    ) {}

    public function aplicar(array $unidade, array $lancados): array
    {
        $taxaDevida = valorDe($lancados, 'taxa') + valorDe($lancados, 'isencao');
        if ($taxaDevida <= 0 || valorDe($lancados, 'debito') > 0) {
            return [];
        }
        $descricao = 'Desconto até ' . diaMes($this->ate) . " ({$this->porcento}%)";
        $desconto = percentual($taxaDevida, $this->porcento);
        return [new Lancamento('desconto', $descricao, -$desconto, condicional: true)];
    }
}
