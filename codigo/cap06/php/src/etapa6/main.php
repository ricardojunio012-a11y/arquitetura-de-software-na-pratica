<?php
// Módulo de reservas original, escrito às pressas para a primeira assembleia.
// NAO MEXER sem falar com o Jorge!!! (calcula fim de semana)
// Etapa 6: a regra nova entra no legado sem refatorá-lo. Parte da etapa 2 (só as
// costuras) e muda o mínimo: um broto (limite.php) e um invólucro (registrarExecucao).
namespace Morada\Etapa6;

require_once __DIR__ . '/limite.php';

$aprovadas = [];
$log = [];

class Smtp
{
    public function enviar($para, $txt)
    {
        global $log;
        $log[] = 'para ' . $para . ': ' . $txt;
    }
}

$smtp = new Smtp();

function processarReservasSemRegistro($arq, $pasta, $hj = null, $correio = null)
{
    global $aprovadas, $log, $smtp;
    $hj ??= new \DateTimeImmutable('today', new \DateTimeZone('UTC'));
    $correio ??= $smtp;
    $d = json_decode(file_get_contents($arq), true);
    $out = [];
    foreach ($d['pedidos'] as $p) {
        $u = array_values(
            array_filter($d['unidades'], fn($x) => $x['id'] == $p['unidade']),
        )[0];
        $e = array_values(
            array_filter($d['espacos'], fn($x) => $x['id'] == $p['espaco']),
        )[0];
        $ok = true;
        $msg = '';
        if ($u['emDebito']) {
            $ok = false;
            $msg = 'débito';
        } else {
            $dt = new \DateTimeImmutable($p['data'], new \DateTimeZone('UTC'));
            $n = intdiv($dt->getTimestamp() - $hj->getTimestamp(), 86400);
            if ($n < 2) {
                $ok = false;
                $msg = 'antecedência';
            } else {
                foreach ($aprovadas as $a) {
                    if ($a['espaco'] == $p['espaco'] && $a['data'] == $p['data']) {
                        $ok = false;
                        $msg = 'conflito';
                    }
                }
                // Broto: a regra nova é uma chamada; o resto está em limite.php
                if ($ok && (new LimitePorMes())->atingido($p, $aprovadas)) {
                    $ok = false;
                    $msg = 'limite de reservas do mês atingido';
                }
            }
        }
        if ($ok) {
            // calcula o valor
            $v = $e['taxa'];
            $dt2 = new \DateTimeImmutable($p['data'], new \DateTimeZone('UTC'));
            if ($dt2->format('w') == 6) {
                $v = $v + intdiv($v * 20, 100); // fim de semana
            }
            if ($p['convidados'] > 50) {
                $v = $v + 5000;
            }
            $aprovadas[] = $p;
            $vv = intdiv($v, 100) . ',' . sprintf('%02d', $v % 100);
            $ini = "{$p['id']};{$p['unidade']};{$p['espaco']};{$p['data']}";
            $out[] = "$ini;aprovada;$vv";
            $correio->enviar(
                $u['email'],
                'Reserva ' . $p['id'] . ' confirmada. Valor: R$ ' . $vv,
            );
        } else {
            $ini = "{$p['id']};{$p['unidade']};{$p['espaco']};{$p['data']}";
            $out[] = "$ini;recusada;$msg";
            $correio->enviar(
                $u['email'],
                'Reserva ' . $p['id'] . ' recusada (' . $msg . ')',
            );
        }
    }
    @mkdir($pasta, 0777, true);
    file_put_contents($pasta . '/reservas.txt', implode("\n", $out) . "\n");
    file_put_contents($pasta . '/emails.txt', implode("\n", $log) . "\n");
}

// Invólucro (wrap method): o nome antigo passa a chamar o código antigo, intocado, e
// depois o comportamento novo. Quem chamava processarReservas não percebe a troca.
function processarReservas($arq, $pasta, $hj = null, $correio = null)
{
    $hj ??= new \DateTimeImmutable('today', new \DateTimeZone('UTC'));
    processarReservasSemRegistro($arq, $pasta, $hj, $correio);
    registrarExecucao($pasta, $hj);
}

// O síndico pediu um registro de cada execução, para a prestação de contas
function registrarExecucao($pasta, \DateTimeImmutable $hj)
{
    $linhas = explode("\n", trim(file_get_contents($pasta . '/reservas.txt')));
    $aprovadas = count(array_filter($linhas, fn($l) => str_contains($l, ';aprovada;')));
    $dia = $hj->format('Y-m-d');
    echo "registro $dia: " . count($linhas) . " pedidos, $aprovadas aprovados\n";
}

// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Só roda quando o arquivo é o programa, e não quando outro arquivo o inclui
if (realpath($argv[0] ?? '') === __FILE__) {
    [, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
    $hoje = new \DateTimeImmutable(
        $opcao === '--hoje' ? $data : 'today',
        new \DateTimeZone('UTC'),
    );
    processarReservas($entrada, $saida, $hoje);
}
