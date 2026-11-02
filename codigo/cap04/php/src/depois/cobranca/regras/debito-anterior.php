<?php
namespace Morada\Depois\Cobranca\Regras;

require_once __DIR__ . '/../tipos.php';
require_once __DIR__ . '/../../../compartilhado/datas.php';

use Morada\Depois\Cobranca\{Lancamento, Regra};
use function Morada\Compartilhado\diaMes;

// O valor que ficou em aberto no mês anterior.
final class DebitoAnterior implements Regra
{
    public function aplicar(array $unidade, array $lancados): array
    {
        $d = $unidade['debitoAnterior'];
        if (!$d) {
            return [];
        }
        $descricao = 'Débito anterior (venc. ' . diaMes($d['vencimento']) . ')';
        return [new Lancamento('debito', $descricao, $d['valorCentavos'])];
    }
}
