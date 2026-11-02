<?php
// Módulo de reservas. Etapa 3: nomes que dizem o que as coisas são e funções
// extraídas (Rename Variable, Extract Function). A estrutura ainda é a original.
namespace Morada\Etapa3;

$aprovadas = [];
$log = [];

class Smtp
{
    public function enviar($para, $texto)
    {
        global $log;
        $log[] = 'para ' . $para . ': ' . $texto;
    }
}

$smtp = new Smtp();

function diasAte(string $dataIso, \DateTimeImmutable $hoje): int
{
    $data = new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC'));
    return intdiv($data->getTimestamp() - $hoje->getTimestamp(), 86400);
}

// O comentário original dizia "fim de semana", mas o código só olha o sábado
function ehSabado(string $dataIso): bool
{
    return (new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC')))->format('w') ==
        6;
}

function valorDaReserva(array $espaco, array $pedido): int
{
    $valor = $espaco['taxa'];
    if (ehSabado($pedido['data'])) {
        $valor = $valor + intdiv($valor * 20, 100);
    }
    if ($pedido['convidados'] > 50) {
        $valor = $valor + 5000;
    }
    return $valor;
}

function reais(int $centavos): string
{
    return intdiv($centavos, 100) . ',' . sprintf('%02d', $centavos % 100);
}

function processarReservas($arquivo, $pasta, $hoje = null, $correio = null)
{
    global $aprovadas, $log, $smtp;
    $hoje ??= new \DateTimeImmutable('today', new \DateTimeZone('UTC'));
    $correio ??= $smtp;
    $dados = json_decode(file_get_contents($arquivo), true);
    $linhas = [];
    foreach ($dados['pedidos'] as $pedido) {
        $unidade = array_values(
            array_filter($dados['unidades'], fn($u) => $u['id'] == $pedido['unidade']),
        )[0];
        $espaco = array_values(
            array_filter($dados['espacos'], fn($e) => $e['id'] == $pedido['espaco']),
        )[0];
        $aprovada = true;
        $motivo = '';
        if ($unidade['emDebito']) {
            $aprovada = false;
            $motivo = 'débito';
        } else {
            if (diasAte($pedido['data'], $hoje) < 2) {
                $aprovada = false;
                $motivo = 'antecedência';
            } else {
                foreach ($aprovadas as $reserva) {
                    if (
                        $reserva['espaco'] == $pedido['espaco'] &&
                        $reserva['data'] == $pedido['data']
                    ) {
                        $aprovada = false;
                        $motivo = 'conflito';
                    }
                }
            }
        }
        $inicio =
            "{$pedido['id']};{$pedido['unidade']};" .
            "{$pedido['espaco']};{$pedido['data']}";
        if ($aprovada) {
            $valor = reais(valorDaReserva($espaco, $pedido));
            $aprovadas[] = $pedido;
            $linhas[] = "$inicio;aprovada;$valor";
            $correio->enviar(
                $unidade['email'],
                "Reserva {$pedido['id']} confirmada. Valor: R$ $valor",
            );
        } else {
            $linhas[] = "$inicio;recusada;$motivo";
            $correio->enviar(
                $unidade['email'],
                "Reserva {$pedido['id']} recusada ($motivo)",
            );
        }
    }
    @mkdir($pasta, 0777, true);
    file_put_contents($pasta . '/reservas.txt', implode("\n", $linhas) . "\n");
    file_put_contents($pasta . '/emails.txt', implode("\n", $log) . "\n");
}

// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new \DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new \DateTimeZone('UTC'),
);
processarReservas($entrada, $saida, $hoje);
