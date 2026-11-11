<?php
// Ponto de entrada HTTP da API, servido pelo servidor embutido do PHP (php -S). Cada
// pedido roda num processo separado, com a sua própria conexão ao banco.
require_once __DIR__ . '/../src/api/api.php';

use function Morada\Api\{atender, conectar, paraJson};

$caminho = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
[$status, $corpo] = atender(
    conectar(getenv('BANCO_URL')),
    $_SERVER['REQUEST_METHOD'],
    $caminho,
    $_GET,
    $_SERVER['HTTP_MORADA_ADMINISTRADORA'] ?? null,
    $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? null,
    file_get_contents('php://input'),
);
http_response_code($status);
$tipo = $status >= 400 ? 'application/problem+json' : 'application/json';
header("Content-Type: $tipo");
// O 401 diz ao cliente como se autenticar (RFC 9110)
if ($status === 401) {
    header('WWW-Authenticate: Bearer');
}
echo paraJson($corpo);
