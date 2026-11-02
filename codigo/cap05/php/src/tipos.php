<?php
// Os dados das reservas e funções pequenas de datas e dinheiro.
namespace Morada;

final readonly class Espaco
{
    public function __construct(
        public string $id,
        public string $nome,
        public int $taxaCentavos,
        public int $antecedenciaMinimaDias,
        public int $limitePorMes,
    ) {}
}

final readonly class Morador
{
    public function __construct(
        public string $nome,
        public string $email,
        public string $canal,
        public ?string $telefone = null,
    ) {}
}

final readonly class Unidade
{
    public function __construct(
        public string $id,
        public bool $emDebito,
        public Morador $morador,
    ) {}
}

final readonly class Pedido
{
    public function __construct(
        public string $id,
        public Unidade $unidade,
        public Espaco $espaco,
        public string $data,
    ) {}
}

final readonly class Decisao
{
    public function __construct(public bool $aprovada, public ?string $motivo = null) {}
}

function diasEntre(\DateTimeImmutable $hoje, string $dataIso): int
{
    $data = new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC'));
    return intdiv($data->getTimestamp() - $hoje->getTimestamp(), 86400);
}

// 2026-03-14 -> 14/03/2026
function dataBr(string $dataIso): string
{
    return implode('/', array_reverse(explode('-', $dataIso)));
}

function reais(int $c): string
{
    return intdiv($c, 100) . ',' . sprintf('%02d', $c % 100);
}
