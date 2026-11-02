<?php
namespace Morada\Depois\Cobranca\Regras;

require_once __DIR__ . '/../tipos.php';
require_once __DIR__ . '/../../../compartilhado/datas.php';

use Morada\Depois\Cobranca\{Lancamento, Regra};
use function Morada\Compartilhado\diasEntre;

// Juros ao mês, proporcionais aos dias de atraso (mês de 30 dias).
final class JurosPorAtraso implements Regra
{
    public function __construct(
        private readonly int $porcentoAoMes,
        private readonly \DateTimeImmutable $hoje,
    ) {}

    public function aplicar(array $unidade, array $lancados): array
    {
        $d = $unidade['debitoAnterior'];
        if (!$d) {
            return [];
        }
        $dias = diasEntre($d['vencimento'], $this->hoje);
        $juros = intdiv(
            $d['valorCentavos'] * $this->porcentoAoMes * $dias + 1500,
            3000,
        );
        return [new Lancamento('juros', "Juros ($dias dias)", $juros)];
    }
}
