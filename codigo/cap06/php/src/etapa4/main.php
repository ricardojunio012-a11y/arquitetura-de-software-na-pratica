<?php
// Módulo de reservas. Etapa 4: condicionais e números mágicos (Replace Nested
// Conditional with Guard Clauses, Replace Magic Literal, Replace Loop with Pipeline).
namespace Morada\Etapa4;

const ANTECEDENCIA_MINIMA_DIAS = 2;
const ACRESCIMO_SABADO_PORCENTO = 20;
const LIMITE_DE_CONVIDADOS = 50;
const TAXA_DE_LIMPEZA_EXTRA = 5000; // centavos

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
    return (new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC')))->format('w') ===
        '6';
}

function valorDaReserva(array $espaco, array $pedido): int
{
    $valor = $espaco['taxa'];
    if (ehSabado($pedido['data'])) {
        $valor += intdiv($valor * ACRESCIMO_SABADO_PORCENTO, 100);
    }
    if ($pedido['convidados'] > LIMITE_DE_CONVIDADOS) {
        $valor += TAXA_DE_LIMPEZA_EXTRA;
    }
    return $valor;
}

function reais(int $centavos): string
{
    return intdiv($centavos, 100) . ',' . sprintf('%02d', $centavos % 100);
}

// Cláusulas de guarda: a primeira regra que falha devolve o motivo
function motivoDaRecusa(
    array $pedido,
    array $unidade,
    \DateTimeImmutable $hoje,
): ?string {
    global $aprovadas;
    if ($unidade['emDebito']) {
        return 'débito';
    }
    if (diasAte($pedido['data'], $hoje) < ANTECEDENCIA_MINIMA_DIAS) {
        return 'antecedência';
    }
    foreach ($aprovadas as $r) {
        if ($r['espaco'] === $pedido['espaco'] && $r['data'] === $pedido['data']) {
            return 'conflito';
        }
    }
    return null;
}

function processarReservas($arquivo, $pasta, $hoje = null, $correio = null)
{
    global $aprovadas, $log, $smtp;
    $hoje ??= new \DateTimeImmutable('today', new \DateTimeZone('UTC'));
    $correio ??= $smtp;
    $dados = json_decode(file_get_contents($arquivo), true);
    $unidades = array_column($dados['unidades'], null, 'id');
    $espacos = array_column($dados['espacos'], null, 'id');
    $linhas = [];
    foreach ($dados['pedidos'] as $pedido) {
        $unidade = $unidades[$pedido['unidade']];
        $motivo = motivoDaRecusa($pedido, $unidade, $hoje);
        $inicio =
            "{$pedido['id']};{$pedido['unidade']};" .
            "{$pedido['espaco']};{$pedido['data']}";
        if ($motivo !== null) {
            $linhas[] = "$inicio;recusada;$motivo";
            $correio->enviar(
                $unidade['email'],
                "Reserva {$pedido['id']} recusada ($motivo)",
            );
            continue;
        }
        $valor = reais(valorDaReserva($espacos[$pedido['espaco']], $pedido));
        $aprovadas[] = $pedido;
        $linhas[] = "$inicio;aprovada;$valor";
        $correio->enviar(
            $unidade['email'],
            "Reserva {$pedido['id']} confirmada. Valor: R$ $valor",
        );
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
