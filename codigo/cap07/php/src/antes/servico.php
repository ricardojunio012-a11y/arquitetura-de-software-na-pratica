<?php
// Serviço que concentra todas as regras. As regras só valem se quem altera os dados
// lembrar de passar por aqui; nada impede outro código de mexer nas reservas direto.
namespace Morada\Antes;

require_once __DIR__ . '/modelo.php';

function dias(string $de, string $ate): int
{
    return intdiv(strtotime($ate . ' UTC') - strtotime($de . ' UTC'), 86400);
}

function formatar(int $centavos): string
{
    return 'R$ ' .
        number_format(intdiv($centavos, 100), 0, ',', '.') .
        ',' .
        sprintf('%02d', $centavos % 100);
}

function reservar(array $c, array $espaco, array &$eventos): string
{
    if ($c['fim'] <= $c['inicio']) {
        return 'recusada;período inválido: o fim deve ser depois do início';
    }
    if (dias($c['em'], $c['data']) < $espaco['antecedenciaMinimaDias']) {
        return 'recusada;antecedência mínima não respeitada';
    }
    foreach (Reservas::$todas as $r) {
        $mesmoHorario =
            $r->data === $c['data'] && $r->inicio < $c['fim'] && $c['inicio'] < $r->fim;
        if (
            $r->espaco === $c['espaco'] &&
            $r->situacao === 'confirmada' &&
            $mesmoHorario
        ) {
            return "recusada;horário sobreposto a {$r->id}";
        }
    }
    $doMes = array_filter(
        Reservas::$todas,
        fn($r) => $r->espaco === $c['espaco'] &&
            $r->unidade === $c['unidade'] &&
            $r->situacao === 'confirmada' &&
            substr($r->data, 0, 7) === substr($c['data'], 0, 7),
    );
    if (count($doMes) >= $espaco['limitePorMes']) {
        return 'recusada;limite mensal da unidade atingido';
    }

    $taxa = $espaco['taxaCentavos'];
    $diaDaSemana = (int) gmdate('w', strtotime($c['data'] . ' UTC'));
    if ($diaDaSemana === 0 || $diaDaSemana === 6) {
        $taxa += intdiv($taxa * 20 + 50, 100);
    }
    $r = new Reserva();
    $r->id = $c['reserva'];
    $r->unidade = $c['unidade'];
    $r->espaco = $c['espaco'];
    $r->data = $c['data'];
    $r->inicio = $c['inicio'];
    $r->fim = $c['fim'];
    $r->taxaCentavos = $taxa;
    Reservas::$todas[] = $r;
    $periodo = "{$c['data']} {$c['inicio']}h-{$c['fim']}h";
    $eventos[] =
        "ReservaConfirmada;{$r->id};{$r->espaco};$periodo;{$r->unidade};" .
        formatar($taxa);
    return 'confirmada;' . formatar($taxa);
}

function cancelar(array $c, array &$eventos): string
{
    $achadas = array_values(
        array_filter(Reservas::$todas, fn($x) => $x->id === $c['reserva']),
    );
    $r = $achadas[0] ?? null;
    if (!$r) {
        return 'não cancelada;reserva não encontrada';
    }
    if ($r->situacao !== 'confirmada') {
        return 'não cancelada;reserva não está confirmada';
    }
    $r->situacao = 'cancelada';
    $multa = dias($c['em'], $r->data) < 2 ? intdiv($r->taxaCentavos * 50 + 50, 100) : 0;
    $detalhe = $multa > 0 ? 'multa ' . formatar($multa) : 'sem multa';
    $eventos[] = "ReservaCancelada;{$r->id};$detalhe";
    return "cancelada;$detalhe";
}
