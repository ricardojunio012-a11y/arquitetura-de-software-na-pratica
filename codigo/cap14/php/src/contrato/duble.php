<?php
// O dublê do provedor, como roteador do servidor HTTP do PHP: confere o pedido e
// devolve a resposta da interação atual, que o consumidor grava num arquivo.
$atual = json_decode(file_get_contents('/tmp/interacao-atual.json'), true);
$esperado = $atual['requisicao'];
$igual =
    $_SERVER['REQUEST_METHOD'] === $esperado['metodo'] &&
    $_SERVER['REQUEST_URI'] === $esperado['caminho'] &&
    json_decode(file_get_contents('php://input'), true) === $esperado['corpo'];
http_response_code($igual ? $atual['resposta']['status'] : 500);
header('Content-Type: application/json');
echo json_encode(
    $igual ? $atual['resposta']['corpo'] : ['erro' => 'pedido inesperado'],
    JSON_UNESCAPED_UNICODE,
);
