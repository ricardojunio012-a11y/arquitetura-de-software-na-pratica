<?php
// O fundo de reserva: o saldo é a soma dos movimentos, e uma saída só pode ser
// registrada se houver saldo.
namespace Morada;

use PDO;

function prepararFundo(PDO $banco): void
{
    $banco->exec('TRUNCATE movimentos');
    $banco->exec('INSERT INTO fundos VALUES (1, 1234) ON CONFLICT DO NOTHING');
    $banco->exec(
        'INSERT INTO movimentos (fundo_id, valor_centavos, descricao) ' .
            "VALUES (1, 100000, 'saldo inicial')",
    );
}

function saldo(PDO $banco, int $fundo): int
{
    $consulta = $banco->prepare(
        'SELECT coalesce(sum(valor_centavos), 0)::int FROM movimentos ' .
            'WHERE fundo_id = ?',
    );
    $consulta->execute([$fundo]);
    return $consulta->fetchColumn();
}

function inserirSaida(PDO $banco, int $fundo, int $valor, string $descricao): void
{
    $banco
        ->prepare(
            'INSERT INTO movimentos (fundo_id, valor_centavos, descricao) ' .
                'VALUES (?, ?, ?)',
        )
        ->execute([$fundo, -$valor, $descricao]);
}

// A forma correta em READ COMMITTED: travar a linha do fundo antes de ler o saldo.
// Duas saídas do mesmo fundo passam a acontecer uma depois da outra.
function registrarSaida(PDO $banco, int $fundo, int $valor, string $descricao): bool
{
    $banco->beginTransaction();
    try {
        $banco
            ->prepare('SELECT id FROM fundos WHERE id = ? FOR UPDATE')
            ->execute([$fundo]);
        if (saldo($banco, $fundo) < $valor) {
            $banco->rollBack();
            return false;
        }
        inserirSaida($banco, $fundo, $valor, $descricao);
        $banco->commit();
        return true;
    } catch (\Throwable $erro) {
        $banco->rollBack();
        throw $erro;
    }
}

// 123456 centavos → "1.234,56"
function reais(int $centavos): string
{
    $sinal = $centavos < 0 ? '-' : '';
    return $sinal . number_format(abs($centavos) / 100, 2, ',', '.');
}
