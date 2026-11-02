<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Monta os módulos; a ordem dos relatórios não importa mais.
require_once __DIR__ . '/cobranca/cobranca.php';
require_once __DIR__ . '/inadimplencia/inadimplencia.php';
require_once __DIR__ . '/prestacao/prestacao.php';

use function Morada\Depois\Cobranca\calcularCobrancas;
use function Morada\Depois\Cobranca\relatorioDeCobrancas;
use function Morada\Depois\Inadimplencia\relatorioDeInadimplencia;
use function Morada\Depois\Prestacao\prestacaoDeContas;

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$dados = json_decode(file_get_contents($entrada), true);
$nome = $dados['condominio']['nome'];
$cobrancas = calcularCobrancas(
    $dados['condominio']['despesasDoMesCentavos'],
    $dados['unidades'],
    $hoje,
);

$relatorios = [
    'inadimplencia' => relatorioDeInadimplencia($nome, $hoje, $cobrancas),
    'cobrancas' => relatorioDeCobrancas($nome, $hoje, $cobrancas),
    'prestacao' => prestacaoDeContas(
        $nome,
        $hoje,
        $cobrancas,
        $dados['despesas'],
        $dados['fundoDeReservaSaldoAnteriorCentavos'],
    ),
];
if (!is_dir($saida)) {
    mkdir($saida, 0777, true);
}
foreach ($relatorios as $tipo => $texto) {
    file_put_contents("$saida/$tipo.txt", $texto);
}
echo "relatórios gerados em $saida\n";
