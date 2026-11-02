<?php
// O banco do Financeiro: os pagamentos e, na versão com outbox, a tabela de eventos
// a publicar, gravada na mesma transação do pagamento.
namespace Morada\Infra;

use PDO;

function conectarBanco(): PDO
{
    // BANCO_URL: postgresql://usuario:senha@servidor:porta/banco
    $u = parse_url(getenv('BANCO_URL'));
    $banco = new PDO(
        "pgsql:host={$u['host']};port={$u['port']};dbname=" . ltrim($u['path'], '/'),
        $u['user'],
        $u['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
    $banco->exec('DROP TABLE IF EXISTS outbox, pagamentos');
    $banco->exec(
        'CREATE TABLE pagamentos (
            id text PRIMARY KEY, unidade text, reserva text, valor_centavos integer)',
    );
    $banco->exec(
        'CREATE TABLE outbox (
            id serial PRIMARY KEY, evento text UNIQUE, conteudo text,
            publicado boolean NOT NULL DEFAULT false)',
    );
    return $banco;
}

function gravarPagamento(PDO $banco, array $p): void
{
    $banco
        ->prepare('INSERT INTO pagamentos VALUES (?, ?, ?, ?)')
        ->execute([$p['pagamento'], $p['unidade'], $p['reserva'], $p['valorCentavos']]);
}

// Pagamento e evento na mesma transação: ou os dois ficam gravados, ou nenhum
function gravarComOutbox(PDO $banco, array $p, array $e): void
{
    $banco->beginTransaction();
    try {
        gravarPagamento($banco, $p);
        $banco
            ->prepare('INSERT INTO outbox (evento, conteudo) VALUES (?, ?)')
            ->execute([$e['evento'], json_encode($e, JSON_UNESCAPED_UNICODE)]);
        $banco->commit();
    } catch (\Throwable $erro) {
        // Sem o rollBack, a conexão ficaria presa numa transação aberta
        $banco->rollBack();
        throw $erro;
    }
}
