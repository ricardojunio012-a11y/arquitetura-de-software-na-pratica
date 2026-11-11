<?php
// O banco da API: condomínios, cobranças, pagamentos e chaves de idempotência. A
// chave primária da tabela de chaves, (administradora, chave), garante um único
// processamento por chave de cada cliente, mesmo com pedidos simultâneos.
namespace Morada\Api;

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

function prepararBanco(string $url, string $arquivoCobrancas): void
{
    $banco = conectar($url);
    $banco->exec(
        <<<SQL
        DROP TABLE IF EXISTS chaves_idempotencia, pagamentos, cobrancas, condominios;
        DROP SEQUENCE IF EXISTS pagamentos_seq;
        CREATE TABLE condominios (id text PRIMARY KEY, administradora text NOT NULL);
        CREATE TABLE cobrancas (
          id text PRIMARY KEY,
          condominio text NOT NULL REFERENCES condominios,
          unidade text NOT NULL,
          vencimento date NOT NULL,
          valor_centavos integer NOT NULL,
          situacao text NOT NULL
        );
        CREATE TABLE pagamentos (
          id text PRIMARY KEY,
          cobranca text NOT NULL UNIQUE REFERENCES cobrancas,
          valor_centavos integer NOT NULL
        );
        CREATE SEQUENCE pagamentos_seq;
        CREATE TABLE chaves_idempotencia (
          administradora text,
          chave text,
          pedido text NOT NULL,
          status integer,
          resposta text,
          PRIMARY KEY (administradora, chave)
        )
        SQL
        ,
    );
    // Quem administra cada condomínio fica em condominios.json, ao lado das cobranças
    $pasta = dirname($arquivoCobrancas);
    $condominio = $banco->prepare('INSERT INTO condominios VALUES (?, ?)');
    foreach (json_decode(file_get_contents("$pasta/condominios.json"), true) as $c) {
        $condominio->execute([$c['id'], $c['administradora']]);
    }
    $cobranca = $banco->prepare('INSERT INTO cobrancas VALUES (?, ?, ?, ?, ?, ?)');
    foreach (json_decode(file_get_contents($arquivoCobrancas), true) as $c) {
        $cobranca->execute([
            $c['id'],
            $c['condominio'],
            $c['unidade'],
            $c['vencimento'],
            $c['valorCentavos'],
            $c['situacao'],
        ]);
    }
}
