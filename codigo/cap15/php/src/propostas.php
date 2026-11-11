<?php
// A versão "compatibilidade": compara cada proposta de entrada/propostas com o
// contrato publicado e diz se ela pode ser publicada sem quebrar os clientes.
require_once __DIR__ . '/contrato/compatibilidade.php';

use function Morada\Contrato\{compararContratos, lerContrato};

$dados = $argv[1];
$publicado = lerContrato("$dados/openapi/publicado/v1.yaml");
$pasta = "$dados/entrada/propostas";

$relatorio = [];
$incompativeis = 0;
$propostas = array_values(array_diff(scandir($pasta), ['.', '..']));
sort($propostas);
foreach ($propostas as $arquivo) {
    $mudancas = compararContratos($publicado, lerContrato("$pasta/$arquivo"));
    $quebra = (bool) array_filter($mudancas, fn($m) => !$m->compativel);
    $incompativeis += (int) $quebra;
    $relatorio[] = "$arquivo: " . ($quebra ? 'INCOMPATÍVEL' : 'compatível');
    foreach ($mudancas as $m) {
        $relatorio[] = '  ' . ($m->compativel ? '+' : '-') . " {$m->texto}";
    }
}
$relatorio[] = '';
$relatorio[] = "propostas incompatíveis: $incompativeis de " . count($propostas);

$saida = "$dados/saida/compatibilidade";
@mkdir($saida, 0777, true);
file_put_contents("$saida/relatorio.txt", implode("\n", $relatorio) . "\n");
echo "compatibilidade: $incompativeis de " . count($propostas) . " incompatíveis\n";
