<?php
// Uso: php main.php <comandos.json> <pasta-de-saída>
// Monta o repositório e o serviço de aplicação e executa os comandos em ordem.
require_once __DIR__ . '/aplicacao/servico-de-reservas.php';

use Morada\Depois\Aplicacao\{AgendasEmMemoria, ServicoDeReservas};
use Morada\Depois\Dominio\{Dinheiro, PoliticaDeUso, ReservaConfirmada};

[, $entrada, $saida] = $argv;
$dados = json_decode(file_get_contents($entrada), true);
$politicas = [];
foreach ($dados['espacos'] as $e) {
    $politicas[$e['id']] = new PoliticaDeUso(
        Dinheiro::deCentavos($e['taxaCentavos']),
        $e['antecedenciaMinimaDias'],
        $e['limitePorMes'],
    );
}

$eventos = [];
$publicar = function ($e) use (&$eventos) {
    $tipo = (new ReflectionClass($e))->getShortName();
    $eventos[] =
        $e instanceof ReservaConfirmada
            ? "$tipo;{$e->reserva};{$e->espaco};{$e->periodo};{$e->unidade};{$e->taxa}"
            : "$tipo;{$e->reserva};" .
                ($e->multa->centavos > 0 ? "multa {$e->multa}" : 'sem multa');
};
$agendas = new AgendasEmMemoria($politicas);
$servico = new ServicoDeReservas($agendas, $publicar);

$resultados = [];
foreach ($dados['comandos'] as $c) {
    $r = $servico->executar($c);
    $resultados[] = "{$r->reserva};{$r->comando};{$r->situacao};{$r->detalhe}";
}
$agenda = [];
foreach ($agendas->todas() as $a) {
    foreach ($a->ativas() as $r) {
        $agenda[] = "{$a->espaco};{$r->id};{$r->periodo};{$r->unidade}";
    }
}

@mkdir($saida, 0777, true);
foreach (
    ['resultados' => $resultados, 'eventos' => $eventos, 'agenda' => $agenda]
    as $n => $l
) {
    file_put_contents("$saida/$n.txt", implode("\n", $l) . "\n");
}
echo count($resultados) . " comandos executados; saída em $saida\n";
