<?php
// Uso: php main.php online|offline|reinicio|persistida <pasta-de-saída>
// Simula uma manhã na portaria com dois tablets. Na versão offline, o tablet A perde
// a internet, trabalha com a fila local e sincroniza ao voltar.
require_once __DIR__ . '/tablet.php';

use Morada\{BffPorteiro, Portaria, Reservas, Tablet};

[, $versao, $saida] = $argv;
$cenario = json_decode(file_get_contents('/dados/entrada/cenario.json'), true);
$portaria = new Portaria($cenario['encomendas']);
$reservas = new Reservas($cenario['convidados']);
// Na versão persistida, o resultado de cada operação vai para uma tabela que
// sobrevive ao processo do BFF; nas outras, fica só na memória dele
$tabelaDeOperacoes = new ArrayObject();
$novoBff = fn() => new BffPorteiro(
    $portaria,
    $reservas,
    $versao === 'persistida' ? $tabelaDeOperacoes : new ArrayObject(),
);
$bff = $novoBff();
$registro = [];
$conectar = function () use (&$bff) {
    return $bff;
};
$tablets = [
    'A' => new Tablet('A', $conectar, $registro),
    'B' => new Tablet('B', $conectar, $registro),
];

foreach ($cenario['passos'] as $passo) {
    if (isset($passo['so']) && !in_array($versao, $passo['so'], true)) {
        continue;
    }
    if ($passo['acao'] === 'reiniciarBff') {
        $bff = $novoBff();
        $registro[] = 'o BFF reiniciou: o que estava só na memória dele se perdeu';
        continue;
    }
    $tablet = $tablets[$passo['tablet']];
    match ($passo['acao']) {
        'abrir' => $tablet->abrir(),
        'desconectar' => $tablet->desconectar(),
        'reconectar' => $tablet->reconectar($passo['perderResposta']),
        'reenviar' => $tablet->reenviar(),
        default => $tablet->operar(
            ['tipo' => $passo['acao']] +
                array_diff_key($passo, ['tablet' => 0, 'acao' => 0]),
        ),
    };
}

$estado = [];
foreach ($portaria->encomendas as $e) {
    $estado[] = isset($e['por'])
        ? "{$e['encomenda']} {$e['unidade']}: {$e['situacao']} " .
            "pelo tablet {$e['por']} às {$e['hora']}"
        : "{$e['encomenda']} {$e['unidade']}: {$e['situacao']}";
}
foreach ($portaria->visitantes as $v) {
    $estado[] = "{$v['nome']} ({$v['reserva']}) entrou às {$v['hora']} pelo tablet {$v['tablet']}";
}
$estado[] = "operações repetidas ignoradas: {$bff->repetidas}";

@mkdir("$saida/$versao", 0777, true);
file_put_contents("$saida/$versao/registro.txt", implode("\n", $registro) . "\n");
file_put_contents("$saida/$versao/estado.txt", implode("\n", $estado) . "\n");
echo "$versao: saída em $saida/$versao\n";
