<?php
namespace Morada\Depois\Cobranca\Regras;

require_once __DIR__ . '/../tipos.php';
require_once __DIR__ . '/../../../compartilhado/dinheiro.php';

use Morada\Depois\Cobranca\{Lancamento, Regra};
use function Morada\Compartilhado\percentual;
use function Morada\Depois\Cobranca\valorDe;

// Percentual sobre a taxa condominial, para o fundo de reserva.
final class FundoDeReserva implements Regra
{
    public function __construct(private readonly int $porcento) {}

    public function aplicar(array $unidade, array $lancados): array
    {
        $fundo = percentual(valorDe($lancados, 'taxa'), $this->porcento);
        return [
            new Lancamento('fundo', "Fundo de reserva ({$this->porcento}%)", $fundo),
        ];
    }
}
