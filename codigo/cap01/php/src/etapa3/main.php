<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Único lugar que conhece arquivos, relógio e implementações concretas.
require __DIR__ . '/aplicacao.php';

use Morada\Etapa3\Boleto;
use Morada\Etapa3\EmailEmArquivo;
use function Morada\Etapa3\gerarCobrancaMensal;

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$dados = json_decode(file_get_contents($entrada), true);

if (!is_dir($saida)) {
    mkdir($saida, 0777, true);
}
$relatorio = gerarCobrancaMensal(
    $dados,
    $hoje,
    new Boleto(),
    new EmailEmArquivo("$saida/emails.txt"),
);
$relatorio->salvar("$saida/cobrancas.txt");
echo "cobranças geradas em $saida\n";
