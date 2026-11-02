<?php
// Relatórios do financeiro: inadimplência e prestação de contas.
namespace Morada\Antes\Relatorios;

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../util/util.php';
require_once __DIR__ . '/../servicos/servicos.php';

use Morada\Antes\Config\Config;
use Morada\Antes\Servicos\Servicos;
use function Morada\Antes\Util\competencia;
use function Morada\Antes\Util\diasDeAtraso;
use function Morada\Antes\Util\reais;

function gerarRelatorio(string $tipo): string
{
    $nome = Config::$dados['condominio']['nome'];
    if ($tipo === 'inadimplencia') {
        // Ordena a lista do outro módulo no lugar (acoplamento de conteúdo)
        usort(Servicos::$cobrancas, fn($a, $b) => $b['debito'] <=> $a['debito']);
        $linhas = ['# Inadimplência ' . competencia() . " - $nome"];
        $linhas[] = 'unidade;morador;dias;debito;multa;juros;atualizado';
        $soma = [0, 0, 0, 0];
        foreach (array_filter(Servicos::$cobrancas, fn($x) => $x['debito'] > 0) as $c) {
            $venc = $c['unidade']['debitoAnterior']['vencimento'];
            // recalcula o que já existe
            $juros = Servicos::jurosDeMora($c['debito'], $venc);
            $valores = [
                $c['debito'],
                $c['multa'],
                $juros,
                $c['debito'] + $c['multa'] + $juros,
            ];
            foreach ($valores as $i => $v) {
                $soma[$i] += $v;
            }
            $linhas[] = implode(';', [
                $c['unidade']['id'],
                $c['unidade']['morador']['nome'],
                diasDeAtraso($venc),
                ...array_map('Morada\Antes\Util\reais', $valores),
            ]);
        }
        $linhas[] = implode(';', [
            'total',
            '',
            '',
            ...array_map('Morada\Antes\Util\reais', $soma),
        ]);
        return implode("\n", $linhas) . "\n";
    }
    // qualquer outro tipo vira prestação de contas
    $taxas = array_sum(array_column(Servicos::$cobrancas, 'taxa'));
    $fundo = array_sum(array_column(Servicos::$cobrancas, 'fundo'));
    $linhas = ['# Prestação de contas ' . competencia() . " - $nome"];
    $linhas[] = 'receitas;taxas condominiais;' . reais($taxas);
    $linhas[] = 'receitas;fundo de reserva;' . reais($fundo);
    $totalDespesas = 0;
    foreach (Config::$dados['despesas'] as $d) {
        $totalDespesas += $d['valorCentavos'];
        $linhas[] = "despesas;{$d['categoria']};" . reais($d['valorCentavos']);
    }
    $linhas[] = 'despesas;total;' . reais($totalDespesas);
    $saldo = Config::$dados['fundoDeReservaSaldoAnteriorCentavos'];
    $linhas[] = 'fundo;saldo anterior;' . reais($saldo);
    $linhas[] = 'fundo;saldo previsto;' . reais($saldo + $fundo);
    return implode("\n", $linhas) . "\n";
}
