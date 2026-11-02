<?php
// Datas no formato ISO (AAAA-MM-DD) e "hoje" recebido por parâmetro.
namespace Morada\Compartilhado;

function diasEntre(string $dataIso, \DateTimeImmutable $hoje): int
{
    $data = new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC'));
    return intdiv($hoje->getTimestamp() - $data->getTimestamp(), 86400);
}

function dataDoMes(\DateTimeImmutable $hoje, int $dia): string
{
    return $hoje->format('Y-m-') . sprintf('%02d', $dia);
}

function rotuloDoMes(\DateTimeImmutable $hoje): string
{
    return $hoje->format('m/Y');
}

// 2026-03-10 -> 10/03
function diaMes(string $dataIso): string
{
    return substr($dataIso, 8, 2) . '/' . substr($dataIso, 5, 2);
}

// 2026-03-10 -> 10/03/2026
function dataBr(string $dataIso): string
{
    return diaMes($dataIso) . '/' . substr($dataIso, 0, 4);
}
