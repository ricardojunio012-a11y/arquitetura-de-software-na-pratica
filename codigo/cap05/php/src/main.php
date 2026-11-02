<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Monta os objetos e processa os pedidos de reserva na ordem em que chegaram.
require_once __DIR__ . '/assinantes.php';
require_once __DIR__ . '/servico.php';
require_once __DIR__ . '/corrida.php';

use Morada\{AntecedenciaMinima, EspacoLivre, LimitePorMes, UnidadeEmDia};
use Morada\{AvisarPortaria, LancarTaxaDeUso, NotificarMorador};
use Morada\{Barramento, FabricaDeCanais, ProvedorSimulado, RepositorioEmMemoria};
use Morada\{Espaco, Morador, Pedido, ServicoDeReservas, Unidade};
use function Morada\corrida;

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$dados = json_decode(file_get_contents($entrada), true);
$espacos = [];
foreach ($dados['espacos'] as $e) {
    $espacos[$e['id']] = new Espaco(...$e);
}
$unidades = [];
foreach ($dados['unidades'] as $u) {
    $unidades[$u['id']] = new Unidade(
        $u['id'],
        $u['emDebito'],
        new Morador(...$u['morador']),
    );
}

$montarAprovacao = function (RepositorioEmMemoria $reservas) use ($hoje) {
    $aprovacao = new UnidadeEmDia();
    $aprovacao
        ->depois(new AntecedenciaMinima($hoje))
        ->depois(new EspacoLivre($reservas))
        ->depois(new LimitePorMes($reservas));
    return $aprovacao;
};
$reservas = new RepositorioEmMemoria();
$aprovacao = $montarAprovacao($reservas);

$provedor = new ProvedorSimulado(
    $dados['falhasSimuladas'],
    $dados['destinosInvalidos'],
);
[$notificacoes, $taxas, $portaria, $esperas] = [[], [], [], []];
// Relógio simulado: anota a espera em vez de esperar de verdade
$esperar = function (int $ms, string $quem) use (&$esperas) {
    $esperas[] = "$quem: espera de $ms ms";
};
$fabrica = new FabricaDeCanais($provedor, $notificacoes, $esperar);
$eventos = new Barramento();
$eventos->assinar('ReservaConfirmada', new LancarTaxaDeUso($taxas));
$eventos->assinar('ReservaConfirmada', new AvisarPortaria($portaria));
$eventos->assinar('ReservaConfirmada', new NotificarMorador($fabrica));
$eventos->assinar('ReservaRecusada', new NotificarMorador($fabrica));

$servico = new ServicoDeReservas($aprovacao, $reservas, $eventos);
$decisoes = [];
foreach ($dados['pedidos'] as $p) {
    $pedido = new Pedido(
        $p['id'],
        $unidades[$p['unidade']],
        $espacos[$p['espaco']],
        $p['data'],
    );
    $d = $servico->solicitar($pedido);
    $resultado = $d->aprovada ? 'aprovada' : "recusada;{$d->motivo}";
    $decisoes[] = "{$p['id']};{$p['unidade']};{$p['espaco']};{$p['data']};$resultado";
}

// State: cancelar depende do estado em que a reserva está
$cancelamentos = [];
foreach ($dados['cancelamentos'] as $id) {
    try {
        $cancelamentos[] = "$id;" . $servico->cancelar($id);
    } catch (\DomainException $erro) {
        $cancelamentos[] = "$id;erro;{$erro->getMessage()}";
    }
}

// Agora a parte difícil: dois pedidos ao mesmo tempo para o mesmo espaço e data
$simultaneos = array_map(
    fn($p) => new Pedido(
        $p['id'],
        $unidades[$p['unidade']],
        $espacos[$p['espaco']],
        $p['data'],
    ),
    $dados['pedidosSimultaneos'],
);
$concorrencia = corrida($simultaneos, function () use ($montarAprovacao) {
    $novas = new RepositorioEmMemoria();
    return [$montarAprovacao($novas), $novas];
});

$arquivos = [
    'reservas' => $decisoes,
    'notificacoes' => $notificacoes,
    'enviados' => $provedor->entregues,
    'taxas' => $taxas,
    'portaria' => $portaria,
    'falhas' => $eventos->falhas,
    'esperas' => $esperas,
    'cancelamentos' => $cancelamentos,
    'concorrencia' => $concorrencia,
];
@mkdir($saida, 0777, true);
foreach ($arquivos as $nome => $linhas) {
    file_put_contents("$saida/$nome.txt", implode("\n", $linhas) . "\n");
}
echo count($decisoes) . " pedidos processados; saída em $saida\n";
