<?php
// Módulo de reservas original, escrito às pressas para a primeira assembleia.
// NAO MEXER sem falar com o Jorge!!! (calcula fim de semana)
// Etapa 2: só os pontos de costura. A data de hoje e o envio de e-mails entram por
// parâmetro, com o comportamento antigo como padrão. Nada mais mudou.
namespace Morada\Etapa2;

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

function processarReservas($arq, $pasta, $hj = null, $correio = null)
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

// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new \DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new \DateTimeZone('UTC'),
);
processarReservas($entrada, $saida, $hoje);
