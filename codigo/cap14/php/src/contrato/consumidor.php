<?php
// Teste de contrato do lado do consumidor. Um dublê responde exatamente o que cada
// interação promete; o cliente real do monólito conversa com ele. Se o cliente
// entende todas as respostas, as interações viram o contrato publicado.
require_once __DIR__ . '/interacoes.php';
require_once __DIR__ . '/../comunicacao/api.php';
require_once __DIR__ . '/../monolito/cliente.php';

use Morada\Monolito\ClienteComunicacao;

use const Morada\Contrato\INTERACOES;

use function Morada\Comunicacao\subir;
use function Morada\Contrato\json;

$saida = $argv[1];
$duble = subir(__DIR__ . '/duble.php', 8091);
$cliente = new ClienteComunicacao('http://127.0.0.1:8091');

// O que o monólito precisa entender de cada resposta
$esperado = [
    'envio de um aviso novo' => ['ok' => true, 'repetido' => false],
    'reenvio de um aviso já enviado' => ['ok' => true, 'repetido' => true],
    'aviso sem texto' => ['ok' => false, 'erro' => 'texto obrigatório'],
];

$relatorio = [];
foreach (INTERACOES as $interacao) {
    file_put_contents('/tmp/interacao-atual.json', json_encode($interacao));
    $corpo = $interacao['requisicao']['corpo'];
    $obtido = $cliente->avisar($corpo['id'], $corpo['texto']);
    $ok = $obtido === $esperado[$interacao['descricao']];
    $relatorio[] =
        "{$interacao['descricao']}: " . ($ok ? 'o cliente entendeu' : 'FALHOU');
}
proc_terminate($duble);

$contrato = [
    'consumidor' => 'monolito',
    'provedor' => 'comunicacao',
    'interacoes' => INTERACOES,
];
@mkdir("$saida/consumidor", 0777, true);
file_put_contents("$saida/consumidor/contrato.json", json($contrato) . "\n");
file_put_contents("$saida/consumidor/relatorio.txt", implode("\n", $relatorio) . "\n");
echo 'consumidor: ' . count(INTERACOES) . " interações no contrato\n";
