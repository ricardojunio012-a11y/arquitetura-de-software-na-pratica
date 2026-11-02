<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Único lugar que conhece arquivos, relógio e implementações concretas.
require __DIR__ . '/aplicacao.php';

use Morada\Etapa4\Boleto;
use Morada\Etapa4\EmailEmArquivo;
use Morada\Etapa4\Pix;
use Morada\Etapa4\WhatsAppEmArquivo;
use function Morada\Etapa4\gerarCobrancaMensal;

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$dados = json_decode(file_get_contents($entrada), true);

if (!is_dir($saida)) {
    mkdir($saida, 0777, true);
}
$meiosDePagamento = ['boleto' => new Boleto(), 'pix' => new Pix()];
$notificadores = [
    'email' => new EmailEmArquivo("$saida/emails.txt"),
    'whatsapp' => new WhatsAppEmArquivo("$saida/whatsapp.txt"),
];
$relatorio = gerarCobrancaMensal($dados, $hoje, $meiosDePagamento, $notificadores);
$relatorio->salvar("$saida/cobrancas.txt");
echo "cobranças geradas em $saida\n";
