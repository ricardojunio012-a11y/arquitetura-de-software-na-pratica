<?php
namespace Morada\Depois\Cobranca\Regras;

require_once __DIR__ . '/../tipos.php';

use Morada\Depois\Cobranca\{Lancamento, Regra};
use function Morada\Depois\Cobranca\valorDe;

// O síndico não paga a taxa condominial (o fundo de reserva continua).
final class IsencaoDoSindico implements Regra
{
    public function aplicar(array $unidade, array $lancados): array
    {
        if (empty($unidade['sindico'])) {
            return [];
        }
        return [
            new Lancamento(
                'isencao',
                'Isenção do síndico',
                -valorDe($lancados, 'taxa'),
            ),
        ];
    }
}
