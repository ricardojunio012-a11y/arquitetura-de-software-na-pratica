<?php
namespace Morada\Depois\Cobranca\Regras;

require_once __DIR__ . '/../tipos.php';
require_once __DIR__ . '/../../../compartilhado/dinheiro.php';

use Morada\Depois\Cobranca\{Lancamento, Regra};
use function Morada\Compartilhado\percentual;

// Multa única sobre o débito em atraso.
final class MultaPorAtraso implements Regra
{
    public function __construct(private readonly int $porcento) {}

    public function aplicar(array $unidade, array $lancados): array
    {
        $d = $unidade['debitoAnterior'];
        if (!$d) {
            return [];
        }
        $multa = percentual($d['valorCentavos'], $this->porcento);
        return [new Lancamento('multa', "Multa ({$this->porcento}%)", $multa)];
    }
}
