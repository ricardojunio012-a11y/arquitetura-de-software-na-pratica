<?php
// Antes: o atalho. Reservas lê a tabela do Financeiro direto e reimplementa a regra
// de inadimplência por conta própria, sem saber que um acordo de parcelamento
// deixa a unidade em dia.
namespace Morada\Antes\Modulos\Reservas\Interno;

require_once __DIR__ . '/../api.php';
require_once __DIR__ . '/../../financeiro/interno/tabela-de-cobrancas.php';

use Morada\Antes\Modulos\Financeiro\Interno\TabelaDeCobrancas;
use Morada\Antes\Modulos\Reservas\SituacaoFinanceira;

final class SituacaoPelaTabela implements SituacaoFinanceira
{
    public function __construct(private readonly TabelaDeCobrancas $tabela) {}

    public function unidadeEmDia(string $unidade, string $hoje): bool
    {
        foreach ($this->tabela->linhas as $l) {
            if (
                $l->unidade === $unidade &&
                $l->situacao !== 'paga' &&
                $l->vencimento < $hoje
            ) {
                return false;
            }
        }
        return true;
    }
}
