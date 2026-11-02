<?php
// Relatório de inadimplência: lê as cobranças, nunca as altera.
namespace Morada\Depois\Inadimplencia;

require_once __DIR__ . '/../cobranca/cobranca.php';
require_once __DIR__ . '/../compartilhado/datas.php';
require_once __DIR__ . '/../compartilhado/dinheiro.php';

use Morada\Depois\Cobranca\Cobranca;
use function Morada\Depois\Compartilhado\reais;
use function Morada\Depois\Compartilhado\rotuloDoMes;

/** @param Cobranca[] $cobrancas */
function relatorioDeInadimplencia(
    string $condominio,
    \DateTimeImmutable $hoje,
    array $cobrancas,
): string {
    // Arrays em PHP são copiados ao passar: ordenar aqui não afeta quem chamou
    $devedores = array_values(
        array_filter($cobrancas, fn(Cobranca $c) => $c->debito > 0),
    );
    usort($devedores, fn($a, $b) => $b->debito <=> $a->debito);
    $linhas = ['# Inadimplência ' . rotuloDoMes($hoje) . " - $condominio"];
    $linhas[] = 'unidade;morador;dias;debito;multa;juros;atualizado';
    $soma = [0, 0, 0, 0];
    foreach ($devedores as $c) {
        $valores = [
            $c->debito,
            $c->multa,
            $c->juros,
            $c->debito + $c->multa + $c->juros,
        ];
        foreach ($valores as $i => $v) {
            $soma[$i] += $v;
        }
        $linhas[] = implode(';', [
            $c->unidade,
            $c->morador,
            $c->diasDeAtraso,
            ...array_map('Morada\Depois\Compartilhado\reais', $valores),
        ]);
    }
    $linhas[] = implode(';', [
        'total',
        '',
        '',
        ...array_map('Morada\Depois\Compartilhado\reais', $soma),
    ]);
    return implode("\n", $linhas) . "\n";
}
