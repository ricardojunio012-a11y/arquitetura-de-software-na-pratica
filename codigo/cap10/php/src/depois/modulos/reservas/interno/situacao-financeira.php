<?php
// Depois: Reservas pergunta ao Financeiro pela API pública. A regra de
// inadimplência continua num lugar só, o módulo que é dono dela.
namespace Morada\Depois\Modulos\Reservas\Interno;

require_once __DIR__ . '/../api.php';
require_once __DIR__ . '/../../financeiro/api.php';

use Morada\Depois\Modulos\Financeiro\Financeiro;
use Morada\Depois\Modulos\Reservas\SituacaoFinanceira;

final class SituacaoPeloFinanceiro implements SituacaoFinanceira
{
    public function __construct(private readonly Financeiro $financeiro) {}

    public function unidadeEmDia(string $unidade, string $hoje): bool
    {
        return $this->financeiro->unidadeEmDia($unidade, $hoje);
    }
}
