<?php
// Regras internas da cobrança, usadas só pelo próprio módulo.
namespace Morada\Depois\Cobranca;

require_once __DIR__ . '/../compartilhado/datas.php';
require_once __DIR__ . '/../compartilhado/dinheiro.php';

use function Morada\Depois\Compartilhado\diasEntre;
use function Morada\Depois\Compartilhado\percentual;

const FUNDO_DE_RESERVA = 10; // % sobre a taxa
const MULTA = 2; // % sobre o débito

function fundoDeReserva(int $taxa): int
{
    return percentual($taxa, FUNDO_DE_RESERVA);
}

function encargos(int $debito, string $vencimento, \DateTimeImmutable $hoje): array
{
    $dias = diasEntre($vencimento, $hoje);
    $juros = intdiv($debito * $dias + 1500, 3000); // 1% ao mês, proporcional
    return ['dias' => $dias, 'multa' => percentual($debito, MULTA), 'juros' => $juros];
}
