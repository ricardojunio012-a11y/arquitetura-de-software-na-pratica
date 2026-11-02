<?php
// Etapa 7: a figueira estranguladora. Uma fachada recebe todos os pedidos e decide,
// espaço por espaço, quem responde: o código velho (etapa 6) ou o novo (novo.php).
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
require_once __DIR__ . '/../etapa6/main.php';
require_once __DIR__ . '/novo.php';

use function Morada\Etapa5\{avisos, relatorio};
use function Morada\Etapa6\processarReservas;
use function Morada\Etapa7\decidir;

// A rota de cada espaço. "experimento": o velho responde e o novo roda junto, só
// para comparar. A cada fatia validada, um espaço muda de rota; no fim, o velho sai.
const ROTAS = ['salao' => 'novo', 'churrasqueira' => 'experimento'];

function rotaDe(array $pedido): string
{
    return ROTAS[$pedido['espaco']] ?? 'velho';
}

final class CorreioQueGuarda
{
    public array $enviados = [];

    public function enviar(string $para, string $texto): void
    {
        $this->enviados[] = "para $para: $texto";
    }
}

// O velho não foi feito para ser chamado assim: recebe um arquivo e grava outro.
// A fachada se adapta a ele, pelas costuras da etapa 2, sem mudar uma linha dele.
function velho(array $dados, DateTimeImmutable $hoje): array
{
    $pasta = sys_get_temp_dir() . '/' . uniqid('velho-');
    @mkdir($pasta, 0777, true);
    file_put_contents("$pasta/pedidos.json", json_encode($dados));
    $correio = new CorreioQueGuarda();
    processarReservas("$pasta/pedidos.json", $pasta, $hoje, $correio);
    $linhas = explode("\n", file_get_contents("$pasta/reservas.txt"));
    $respostas = [];
    foreach ($dados['pedidos'] as $i => $p) {
        $respostas[$p['id']] = [$linhas[$i], $correio->enviados[$i]];
    }
    return $respostas;
}

function novo(array $dados, DateTimeImmutable $hoje): array
{
    $decisoes = decidir($dados, $hoje);
    $linhas = relatorio($decisoes);
    $avisos = avisos($decisoes);
    $respostas = [];
    foreach ($decisoes as $i => $d) {
        $respostas[$d->pedido['id']] = [
            $linhas[$i],
            "para {$avisos[$i][0]}: {$avisos[$i][1]}",
        ];
    }
    return $respostas;
}

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$dados = json_decode(file_get_contents($entrada), true);
$so = fn(array $rotas) => [
    'pedidos' => array_values(
        array_filter($dados['pedidos'], fn($p) => in_array(rotaDe($p), $rotas)),
    ),
] + $dados;
$doVelho = velho($so(['velho', 'experimento']), $hoje);
$doNovo = novo($so(['novo', 'experimento']), $hoje);

// O experimento compara as duas respostas, mas quem responde ao morador é o velho
$comparados = array_filter($dados['pedidos'], fn($p) => rotaDe($p) === 'experimento');
$divergentes = array_filter(
    $comparados,
    fn($p) => $doVelho[$p['id']] !== $doNovo[$p['id']],
);
echo 'experimento: ' .
    count($comparados) .
    ' pedidos comparados, ' .
    count($divergentes) .
    " com divergência\n";
foreach ($divergentes as $p) {
    echo "  {$p['id']}: velho {$doVelho[$p['id']][0]} | novo {$doNovo[$p['id']][0]}\n";
}

$respostas = array_map(
    fn($p) => (rotaDe($p) === 'novo' ? $doNovo : $doVelho)[$p['id']],
    $dados['pedidos'],
);
@mkdir($saida, 0777, true);
file_put_contents(
    "$saida/reservas.txt",
    implode("\n", array_column($respostas, 0)) . "\n",
);
file_put_contents(
    "$saida/emails.txt",
    implode("\n", array_column($respostas, 1)) . "\n",
);
