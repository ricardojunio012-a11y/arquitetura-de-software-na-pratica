<?php
namespace Morada\Depois\Cobranca\Regras;

require_once __DIR__ . '/../tipos.php';
require_once __DIR__ . '/../../../compartilhado/dinheiro.php';

use Morada\Depois\Cobranca\{Lancamento, Regra};
use function Morada\Compartilhado\parteDe;

// A parte da unidade nas despesas do mês, pela fração ideal.
final class TaxaCondominial implements Regra
{
    public function __construct(private readonly int $despesasDoMes) {}

    public function aplicar(array $unidade, array $lancados): array
    {
        $taxa = parteDe($this->despesasDoMes, $unidade['fracaoMilionesimos']);
        return [new Lancamento('taxa', 'Taxa condominial', $taxa)];
    }
}
