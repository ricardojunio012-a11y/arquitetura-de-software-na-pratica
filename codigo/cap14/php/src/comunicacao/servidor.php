<?php
// Roteador do servidor HTTP embutido do PHP para a API real, com os avisos no
// PostgreSQL. Usado pelo teste de ponta a ponta.
require_once __DIR__ . '/api.php';
require_once __DIR__ . '/postgres.php';

use Morada\Comunicacao\{AvisosNoPostgres, Comunicacao};

use function Morada\Comunicacao\atender;

$comunicacao = new Comunicacao(AvisosNoPostgres::conectar(getenv('BANCO_URL'), false));
[$status, $corpo] = atender(
    $comunicacao,
    $_SERVER['REQUEST_METHOD'],
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH),
    file_get_contents('php://input'),
);
http_response_code($status);
header('Content-Type: application/json');
echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
