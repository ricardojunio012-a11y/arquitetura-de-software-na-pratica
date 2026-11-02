<?php
// Uso: php main.php <comandos.json> <pasta-de-saída>
// Monta os módulos e executa os comandos do Financeiro e de Reservas em ordem.
require_once __DIR__ . '/modulos/financeiro/api.php';
require_once __DIR__ . '/modulos/reservas/api.php';
require_once __DIR__ . '/modulos/reservas/interno/situacao-financeira.php';

use Morada\Antes\Modulos\Financeiro\Financeiro;
use Morada\Antes\Modulos\Financeiro\Interno\TabelaDeCobrancas;
use Morada\Antes\Modulos\Reservas\{RecusaErro, Reservas};
use Morada\Antes\Modulos\Reservas\Interno\SituacaoPelaTabela;

[, $entrada, $saida] = $argv;
$dados = json_decode(file_get_contents($entrada), true);
$tabela = new TabelaDeCobrancas();
$financeiro = new Financeiro($tabela);
// O atalho: Reservas recebe a tabela do Financeiro, e não a API dele
$reservas = new Reservas($dados['espacos'], new SituacaoPelaTabela($tabela));

function executar(array $c, Financeiro $financeiro, Reservas $reservas): array
{
    return match ($c['tipo']) {
        'emitir' => [
            $c['cobranca'],
            'emitida',
            $financeiro->emitir(
                $c['cobranca'],
                $c['unidade'],
                $c['valorCentavos'],
                $c['vencimento'],
            ),
        ],
        'pagar' => [
            $c['cobranca'],
            'paga',
            $financeiro->pagar($c['cobranca'], $c['em']),
        ],
        'parcelar' => [
            $c['cobranca'],
            'parcelada',
            $financeiro->parcelar($c['cobranca'], $c['parcelas']),
        ],
        default => reservar($c, $reservas),
    };
}

function reservar(array $c, Reservas $reservas): array
{
    try {
        $detalhe = $reservas->reservar(
            $c['reserva'],
            $c['unidade'],
            $c['espaco'],
            $c['data'],
            $c['em'],
        );
        return [$c['reserva'], 'confirmada', $detalhe];
    } catch (RecusaErro $erro) {
        return [$c['reserva'], 'recusada', $erro->getMessage()];
    }
}

$linhas = [];
foreach ($dados['comandos'] as $c) {
    [$id, $situacao, $detalhe] = executar($c, $financeiro, $reservas);
    $linhas[] = "$id;{$c['tipo']};$situacao;$detalhe";
}
@mkdir($saida, 0777, true);
file_put_contents("$saida/resultados.txt", implode("\n", $linhas) . "\n");
echo count($linhas) . " comandos executados; saída em $saida\n";
