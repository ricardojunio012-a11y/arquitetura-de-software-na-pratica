<?php
// A versão "api": prepara o banco, envia as requisições do roteiro à API (servida
// por php -S, iniciado pelo rodar.sh) e confere cada resposta contra openapi/v1.yaml.
require_once __DIR__ . '/api/api.php';
require_once __DIR__ . '/contrato/validar.php';

use function Morada\Api\{conectar, paraJson, prepararBanco};
use function Morada\Contrato\{lerContrato, validarResposta};

[, $dados, $url] = $argv;
$saida = "$dados/saida/api";
$urlBanco = getenv('BANCO_URL');
prepararBanco($urlBanco, "$dados/entrada/cobrancas.json");
$contrato = lerContrato("$dados/openapi/v1.yaml");
$requisicoes = json_decode(file_get_contents("$dados/entrada/requisicoes.json"), true);

function enviar(string $url, array $r): array
{
    $cabecalhos = ['Content-Type: application/json'];
    // Quem chama (no lugar do token de acesso) e a chave de idempotência
    if (isset($r['administradora'])) {
        $cabecalhos[] = "Morada-Administradora: {$r['administradora']}";
    }
    if (isset($r['chave'])) {
        $cabecalhos[] = "Idempotency-Key: {$r['chave']}";
    }
    $curl = curl_init($url . $r['caminho']);
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $r['metodo'],
        CURLOPT_HTTPHEADER => $cabecalhos,
        CURLOPT_RETURNTRANSFER => true,
    ]);
    if (isset($r['corpo'])) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($r['corpo']));
    }
    $texto = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $tipo = curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
    return [$status, $tipo, $texto];
}

$respostas = [];
$divergencias = [];
foreach ($requisicoes as $i => $r) {
    [$status, $tipo, $texto] = enviar($url, $r);
    $extras = [];
    if (isset($r['administradora'])) {
        $extras[] = "Morada-Administradora: {$r['administradora']}";
    }
    if (isset($r['chave'])) {
        $extras[] = "Idempotency-Key: {$r['chave']}";
    }
    $lista = $extras ? ' (' . implode(', ', $extras) . ')' : '';
    $respostas[] = $i + 1 . ". {$r['descricao']}";
    $respostas[] = "   {$r['metodo']} {$r['caminho']}$lista";
    if (isset($r['corpo'])) {
        $respostas[] = '   ' . paraJson($r['corpo']);
    }
    $respostas[] = "   → $status $tipo";
    $respostas[] = '   ' . paraJson(json_decode($texto, true));
    $respostas[] = '';
    $caminho = parse_url($r['caminho'], PHP_URL_PATH);
    $divergencias = [
        ...$divergencias,
        ...validarResposta(
            $contrato,
            $r['metodo'],
            $caminho,
            $status,
            $tipo,
            json_decode($texto),
        ),
    ];
}

$banco = conectar($urlBanco);
$pagamentos = $banco
    ->query('SELECT id, cobranca, valor_centavos FROM pagamentos ORDER BY id')
    ->fetchAll(PDO::FETCH_ASSOC);
$pagas = $banco
    ->query("SELECT id FROM cobrancas WHERE situacao = 'paga' ORDER BY id")
    ->fetchAll(PDO::FETCH_COLUMN);
$chaves = $banco
    ->query(
        <<<SQL
        SELECT administradora, string_agg(chave, ', ' ORDER BY chave) AS lista
        FROM chaves_idempotencia GROUP BY administradora ORDER BY administradora
        SQL
        ,
    )
    ->fetchAll(PDO::FETCH_ASSOC);
$estado = ['pagamentos registrados: ' . count($pagamentos)];
foreach ($pagamentos as $p) {
    $valor = $p['valor_centavos'];
    $estado[] = "  {$p['id']}: cobrança {$p['cobranca']}, $valor centavos";
}
$estado[] = 'cobranças pagas: ' . implode(', ', $pagas);
$estado[] = 'chaves de idempotência guardadas:';
foreach ($chaves as $c) {
    $estado[] = "  {$c['administradora']}: {$c['lista']}";
}
$conferencia = [
    count($requisicoes) . ' respostas conferidas com openapi/v1.yaml',
    ...$divergencias ?: ['nenhuma divergência'],
];

@mkdir($saida, 0777, true);
file_put_contents("$saida/respostas.txt", implode("\n", $respostas));
file_put_contents("$saida/estado.txt", implode("\n", $estado) . "\n");
file_put_contents("$saida/contrato.txt", implode("\n", $conferencia) . "\n");
echo 'api: ' .
    count($requisicoes) .
    ' requisições, ' .
    count($divergencias) .
    " divergências\n";
