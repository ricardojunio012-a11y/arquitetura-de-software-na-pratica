<?php
// Simulação da fila de registro em lote no banco emissor (o "agora a parte difícil").
// Relógio simulado e sorteio com semente fixa: a mesma saída em qualquer máquina.
// Os números do arquivo registro.json são premissas do laboratório, não de um banco real.
namespace Morada\Registro;

final class Resultado
{
    public int $arquivos = 0;
    public int $tentativas = 0;
    /** @var array<int,int> segundo da simulação => quantos boletos */
    public array $disponivelEm = [];
    public int $semRegistro = 0; // nunca ficaram disponíveis
    public int $viaPix = 0; // receberam o Pix no lugar do boleto
}

// Gerador congruente de Park e Miller: só inteiros, igual nas quatro linguagens
function sorteador(int $semente): \Closure
{
    $x = $semente;
    return function () use (&$x): int {
        $x = ($x * 48271) % 2147483647;
        return $x;
    };
}

// ingênua: reenvia toda recusa e só avisa o morador com o boleto registrado.
// ajustada: recusa definitiva não volta para a fila, e o boleto que não daria
// tempo de confirmar vira Pix (a alternativa do ADR-002).
function simular(array $p, bool $ajustada): Resultado
{
    $sortear = sorteador($p['semente']);
    $fila = []; // [envio, ordem, boletos, tentativa]
    for ($i = 0; $i < $p['boletos']; $i += $p['boletosPorArquivo']) {
        $fim = min($p['boletos'], $i + $p['boletosPorArquivo']);
        $fila[] = [0, count($fila), range($i, $fim - 1), 1];
    }
    $r = new Resultado();
    $ordem = count($fila);
    $bancoLivre = 0;
    $vazao = $p['registrosPorSegundo'];
    while ($fila) {
        // O banco processa um arquivo por vez, na ordem de chegada
        $i = 0;
        foreach ($fila as $k => $a) {
            if ([$a[0], $a[1]] < [$fila[$i][0], $fila[$i][1]]) {
                $i = $k;
            }
        }
        [$envio, , $boletos, $tentativa] = $fila[$i];
        array_splice($fila, $i, 1);
        $r->arquivos++;
        $r->tentativas += count($boletos);
        $inicio = max($envio, $bancoLivre);
        $bancoLivre = $inicio + intdiv(count($boletos) + $vazao - 1, $vazao);
        $retorno = $bancoLivre + $p['retornoSegundos'];
        $reenviar = [];
        foreach ($boletos as $b) {
            $definitiva = $b % $p['recusaDefinitivaACada'] === 0;
            $recusado = $definitiva || $sortear() % 100 < $p['falhaPassageiraPorCento'];
            if (!$recusado) {
                $r->disponivelEm[$retorno] = ($r->disponivelEm[$retorno] ?? 0) + 1;
            } elseif (!$ajustada) {
                if ($tentativa < $p['maxTentativas']) {
                    $reenviar[] = $b;
                } else {
                    $r->semRegistro++;
                }
            } elseif (
                $definitiva ||
                $tentativa >= $p['maxTentativas'] ||
                $retorno + $p['retornoSegundos'] > $p['limiteSegundos']
            ) {
                // o aviso sai com o Pix, sem esperar outro ciclo
                $r->disponivelEm[$retorno] = ($r->disponivelEm[$retorno] ?? 0) + 1;
                $r->viaPix++;
            } else {
                $reenviar[] = $b;
            }
        }
        if ($reenviar) {
            $fila[] = [$retorno, $ordem++, $reenviar, $tentativa + 1];
        }
    }
    return $r;
}

// Percentil pela posição mais próxima, em milésimos (990 = p99, 999 = p99,9).
// Devolve null quando ele cai nos boletos que nunca ficaram disponíveis.
function percentil(Resultado $r, int $total, int $milesimos): ?int
{
    $posicao = intdiv($milesimos * $total + 999, 1000);
    $tempos = $r->disponivelEm;
    ksort($tempos);
    $acumulado = 0;
    foreach ($tempos as $t => $n) {
        $acumulado += $n;
        if ($acumulado >= $posicao) {
            return $t;
        }
    }
    return null;
}

function disponiveisAte(Resultado $r, int $limite): int
{
    $soma = 0;
    foreach ($r->disponivelEm as $t => $n) {
        if ($t <= $limite) {
            $soma += $n;
        }
    }
    return $soma;
}
