<?php
// Uso: php main.php monolito|servico <pasta-de-saída>
// Envia um aviso por pagamento confirmado: pelo módulo, no mesmo processo, ou pelo
// serviço extraído, pela rede. Conta o que aconteceu e mede o tempo de cada aviso.
require_once __DIR__ . '/comunicacao.php';

use Morada\Comunicacao;

[, $versao, $saida] = $argv;
$avisos = json_decode(file_get_contents('/dados/entrada/carga.json'), true)['avisos'];
$url = getenv('COMUNICACAO_URL');
$conta = [
    'enviados' => 0,
    'chamadas' => 0,
    'erros' => 0,
    'novasTentativas' => 0,
    'repetidos' => 0,
    'perdidos' => 0,
];

function post(string $url, array $corpo): array
{
    $contexto = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($corpo),
            'timeout' => 2,
            'ignore_errors' => true,
        ],
    ]);
    $resposta = @file_get_contents($url, false, $contexto);
    $status = isset($http_response_header[0])
        ? (int) explode(' ', $http_response_header[0])[1]
        : 0;
    return [$status, json_decode($resposta ?: '{}', true)];
}

// Pela rede, cada chamada pode falhar: tenta até 3 vezes, sempre com o mesmo id
function enviarPelaRede(string $url, string $id, string $texto, array &$conta): void
{
    for ($tentativa = 1; $tentativa <= 3; $tentativa++) {
        if ($tentativa > 1) {
            $conta['novasTentativas']++;
            // Espera crescente (de 5 a 10 ms, depois de 10 a 20 ms), com variação,
            // para que clientes que falharam juntos não voltem todos no mesmo instante
            $teto = 10 * 2 ** ($tentativa - 2);
            usleep(
                (int) (($teto / 2 + (mt_rand() / mt_getrandmax()) * ($teto / 2)) *
                    1000),
            );
        }
        $conta['chamadas']++;
        [$status, $corpo] = post("$url/avisos", ['id' => $id, 'texto' => $texto]);
        if ($status === 200) {
            if ($corpo['situacao'] === 'repetido') {
                $conta['repetidos']++;
            }
            $conta['enviados']++;
            return;
        }
        $conta['erros']++;
    }
    $conta['perdidos']++;
}

$modulo = new Comunicacao();
if ($versao === 'servico') {
    post("$url/reiniciar", []);
}
$tempos = [];
$inicio = hrtime(true);
for ($i = 1; $i <= $avisos; $i++) {
    $id = sprintf('E-P-%03d', $i);
    $texto = 'pagamento ' . substr($id, 2) . ' recebido';
    $t0 = hrtime(true);
    if ($versao === 'servico') {
        enviarPelaRede($url, $id, $texto, $conta);
    } elseif ($modulo->avisar($id, $texto)) {
        $conta['enviados']++;
    }
    $tempos[] = (hrtime(true) - $t0) / 1e6;
}
$total = (hrtime(true) - $inicio) / 1e6;

$ordenados = $tempos;
sort($ordenados);
$ms = fn($v) => sprintf('%.3f ms', $v);
@mkdir("$saida/$versao", 0777, true);
file_put_contents(
    "$saida/$versao/resultado.txt",
    implode("\n", [
        "avisos enviados: {$conta['enviados']}",
        "chamadas pela rede: {$conta['chamadas']}",
        "respostas com erro: {$conta['erros']}",
        "novas tentativas: {$conta['novasTentativas']}",
        "avisos repetidos ignorados: {$conta['repetidos']}",
        "avisos perdidos: {$conta['perdidos']}",
    ]) . "\n",
);
// Os tempos variam de máquina para máquina: ficam fora da pasta verificada
file_put_contents(
    "$saida/tempos-$versao.txt",
    implode("\n", [
        'tempo médio por aviso: ' . $ms(array_sum($tempos) / count($tempos)),
        'p95 por aviso: ' . $ms($ordenados[(int) floor(count($ordenados) * 0.95)]),
        'pior aviso: ' . $ms(end($ordenados)),
        'tempo total: ' . $ms($total),
    ]) . "\n",
);
echo "$versao: {$conta['enviados']} avisos; saída em $saida/$versao\n";
