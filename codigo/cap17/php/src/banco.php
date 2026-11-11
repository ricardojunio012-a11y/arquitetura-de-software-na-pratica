<?php
// Conexão com o PostgreSQL e transações em nome de um condomínio ou de uma
// administradora.
namespace Morada;

use PDO;

// URL: postgresql://usuario:senha@servidor:porta/banco
function conectar(string $url): PDO
{
    $u = parse_url($url);
    $dsn = "pgsql:host={$u['host']};port={$u['port']};dbname=" . ltrim($u['path'], '/');
    return new PDO($dsn, $u['user'], $u['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
}

// Executa uma função numa transação em nome de quem pede. O "true" do set_config
// faz o valor valer só nesta transação: numa conexão reaproveitada de um pool, o
// condomínio do pedido anterior não sobra para o próximo.
function emNomeDe(
    PDO $banco,
    string $configuracao,
    ?int $valor,
    callable $funcao,
): mixed {
    $banco->beginTransaction();
    try {
        if ($valor !== null) {
            $banco
                ->prepare('SELECT set_config(?, ?, true)')
                ->execute([$configuracao, (string) $valor]);
        }
        $resultado = $funcao();
        $banco->commit();
        return $resultado;
    } catch (\Throwable $erro) {
        $banco->rollBack();
        throw $erro;
    }
}

// O síndico age em nome de um condomínio. A administradora age em nome de todos os
// que administra, que a política do banco busca na tabela administracoes.
function comoCondominio(PDO $banco, ?int $condominio, callable $funcao): mixed
{
    return emNomeDe($banco, 'app.condominio', $condominio, $funcao);
}

function comoAdministradora(PDO $banco, int $administradora, callable $funcao): mixed
{
    return emNomeDe($banco, 'app.administradora', $administradora, $funcao);
}
