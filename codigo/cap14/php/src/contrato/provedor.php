<?php
// Verificação do contrato do lado do provedor. Lê o contrato publicado pelo
// consumidor, prepara o estado pedido em cada interação, entrega o pedido à camada
// HTTP real da Comunicação e compara a resposta com a combinada.
require_once __DIR__ . '/../comunicacao/api.php';

use Morada\Comunicacao\{AvisosEmMemoria, Comunicacao};

use function Morada\Comunicacao\atender;

$saida = $argv[1];
$contrato = json_decode(file_get_contents("$saida/consumidor/contrato.json"), true);

// Cada estado do contrato tem uma preparação do lado do provedor
$estados = [
    'nenhum aviso foi enviado' => fn($c) => null,
    'o aviso E-P-001 já foi enviado' => fn($c) => $c->avisar(
        'E-P-001',
        'pagamento recebido',
    ),
];

// A resposta cumpre o contrato se tem o status combinado e os campos que o
// consumidor declarou. Campos a mais não quebram ninguém.
function cumpre(array $obtido, array $esperado): bool
{
    if ($obtido['status'] !== $esperado['status']) {
        return false;
    }
    foreach ($esperado['corpo'] as $campo => $valor) {
        if (($obtido['corpo'][$campo] ?? null) !== $valor) {
            return false;
        }
    }
    return true;
}

$relatorio = [];
foreach ($contrato['interacoes'] as $interacao) {
    $comunicacao = new Comunicacao(new AvisosEmMemoria());
    $estados[$interacao['estado']]($comunicacao);
    $requisicao = $interacao['requisicao'];
    [$status, $corpo] = atender(
        $comunicacao,
        $requisicao['metodo'],
        $requisicao['caminho'],
        json_encode($requisicao['corpo']),
    );
    $obtido = ['status' => $status, 'corpo' => $corpo];
    $ok = cumpre($obtido, $interacao['resposta']);
    $relatorio[] = $ok
        ? "{$interacao['descricao']}: verificada"
        : "{$interacao['descricao']}: FALHOU (esperado " .
            json_encode($interacao['resposta'], JSON_UNESCAPED_UNICODE) .
            ', recebido ' .
            json_encode($obtido, JSON_UNESCAPED_UNICODE) .
            ')';
}

@mkdir("$saida/provedor", 0777, true);
file_put_contents("$saida/provedor/relatorio.txt", implode("\n", $relatorio) . "\n");
echo 'provedor: ' . count($relatorio) . " interações verificadas\n";
exit(str_contains(implode($relatorio), 'FALHOU') ? 1 : 0);
