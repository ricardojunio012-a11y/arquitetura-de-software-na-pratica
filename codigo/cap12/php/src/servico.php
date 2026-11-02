<?php
// O serviço de Comunicação: o mesmo módulo, agora atrás de uma API HTTP, num
// processo e num contêiner próprios. Com FALHAS=sim, falha de propósito: a cada 25
// chamadas recusa o pedido, e a cada 40 envia o aviso mas "perde" a resposta.
// O servidor embutido do PHP atende cada requisição do zero, por isso o estado do
// serviço fica num arquivo.
require_once __DIR__ . '/comunicacao.php';

use Morada\Comunicacao;

const ESTADO = '/tmp/comunicacao.json';

function responder(int $status, array $corpo): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
}

$metodo = $_SERVER['REQUEST_METHOD'];
$caminho = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($metodo === 'GET' && $caminho === '/saude') {
    responder(200, []);
    return;
}
// Só para o laboratório: começa cada execução do zero
if ($metodo === 'POST' && $caminho === '/reiniciar') {
    file_put_contents(ESTADO, json_encode(['chamadas' => 0, 'enviados' => []]));
    responder(200, []);
    return;
}
if ($metodo !== 'POST' || $caminho !== '/avisos') {
    responder(404, ['erro' => 'não encontrado']);
    return;
}

$aviso = json_decode(file_get_contents('php://input'), true);
$estado = json_decode(
    @file_get_contents(ESTADO) ?: '{"chamadas":0,"enviados":{}}',
    true,
);
$falhar = getenv('FALHAS') === 'sim';
$estado['chamadas']++;
$comunicacao = new Comunicacao((array) $estado['enviados']);
if ($falhar && $estado['chamadas'] % 25 === 0) {
    $status = [503, ['erro' => 'indisponível']];
} else {
    $enviado = $comunicacao->avisar($aviso['id'], $aviso['texto']);
    $status =
        $falhar && $estado['chamadas'] % 40 === 0
            ? [503, ['erro' => 'tempo esgotado']]
            : [
                200,
                [
                    'aviso' => $aviso['id'],
                    'situacao' => $enviado ? 'enviado' : 'repetido',
                ],
            ];
}
$estado['enviados'] = $comunicacao->enviados();
file_put_contents(ESTADO, json_encode($estado));
responder(...$status);
