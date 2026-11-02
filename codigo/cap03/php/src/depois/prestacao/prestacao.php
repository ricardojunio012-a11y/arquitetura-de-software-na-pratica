<?php
// Prestação de contas: recebe só o que precisa, por parâmetro.
namespace Morada\Depois\Prestacao;

require_once __DIR__ . '/../cobranca/cobranca.php';
require_once __DIR__ . '/../compartilhado/datas.php';
require_once __DIR__ . '/../compartilhado/dinheiro.php';

use Morada\Depois\Cobranca\Cobranca;
use function Morada\Depois\Compartilhado\reais;
use function Morada\Depois\Compartilhado\rotuloDoMes;

/**
 * @param Cobranca[] $cobrancas
 * @param array<array{categoria: string, valorCentavos: int}> $despesas
 */
function prestacaoDeContas(
    string $condominio,
    \DateTimeImmutable $hoje,
    array $cobrancas,
    array $despesas,
    int $saldoAnteriorDoFundo,
): string {
    $taxas = array_sum(array_map(fn(Cobranca $c) => $c->taxa, $cobrancas));
    $fundo = array_sum(array_map(fn(Cobranca $c) => $c->fundo, $cobrancas));
    $linhas = ['# Prestação de contas ' . rotuloDoMes($hoje) . " - $condominio"];
    $linhas[] = 'receitas;taxas condominiais;' . reais($taxas);
    $linhas[] = 'receitas;fundo de reserva;' . reais($fundo);
    foreach ($despesas as $d) {
        $linhas[] = "despesas;{$d['categoria']};" . reais($d['valorCentavos']);
    }
    $linhas[] =
        'despesas;total;' . reais(array_sum(array_column($despesas, 'valorCentavos')));
    $linhas[] = 'fundo;saldo anterior;' . reais($saldoAnteriorDoFundo);
    $linhas[] = 'fundo;saldo previsto;' . reais($saldoAnteriorDoFundo + $fundo);
    return implode("\n", $linhas) . "\n";
}
