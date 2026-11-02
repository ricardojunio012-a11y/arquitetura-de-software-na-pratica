<?php
// Relatórios: só leem cobranças e registros. Uma regra nova aparece aqui sozinha.
namespace Morada\Depois\Relatorios;

require_once __DIR__ . '/emissao/gateway.php';
require_once __DIR__ . '/../compartilhado/datas.php';
require_once __DIR__ . '/../compartilhado/dinheiro.php';

use Morada\Depois\Emissao\Prazos;
use function Morada\Compartilhado\{diaMes, reais};

function linha(string $texto, int $valor): string
{
    return '  ' .
        mb_str_pad($texto, 40) .
        str_pad(reais($valor), 10, ' ', STR_PAD_LEFT);
}

function relatorioDeCobrancas(string $titulo, array $cobrancas, Prazos $prazos): string
{
    $linhas = ["# Cobranças $titulo"];
    foreach ($cobrancas as $c) {
        array_push($linhas, '', "{$c->unidade} {$c->morador}");
        foreach ($c->lancamentos as $l) {
            $linhas[] = linha($l->descricao, $l->valor);
        }
        $linhas[] = linha('Total', $c->total());
        if ($c->desconto() > 0) {
            $texto = 'Total com desconto até ' . diaMes($prazos->descontoAte);
            $linhas[] = linha($texto, $c->total() - $c->desconto());
        }
    }
    return implode("\n", $linhas) . "\n";
}

function relatorioDeRegistros(
    string $titulo,
    string $gateway,
    array $cobrancas,
    array $registros,
): string {
    $linhas = ["# Registros $titulo - $gateway"];
    $linhas[] = 'unidade;identificador;valor;desconto';
    foreach ($registros as $i => $r) {
        $c = $cobrancas[$i];
        $linhas[] =
            "{$r->unidade};{$r->identificador};" .
            reais($c->total()) .
            ';' .
            reais($c->desconto());
    }
    return implode("\n", $linhas) . "\n";
}
