<?php
// Conexão com o PostgreSQL e um esquema limpo para cada experimento.
namespace Morada;

use PDO;

// BANCO_URL: postgresql://usuario:senha@servidor:porta/banco
function conectar(string $url): PDO
{
    $u = parse_url($url);
    $dsn = "pgsql:host={$u['host']};port={$u['port']};dbname=" . ltrim($u['path'], '/');
    return new PDO($dsn, $u['user'], $u['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
}

function recriarEsquema(PDO $banco): void
{
    $banco->exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
}
