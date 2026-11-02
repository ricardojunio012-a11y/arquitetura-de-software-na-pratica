<?php
// Datas recebidas por parâmetro: nada de relógio escondido.
namespace Morada\Depois\Compartilhado;

function diasEntre(string $dataIso, \DateTimeImmutable $hoje): int
{
    return (new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC')))->diff(
        $hoje,
    )->days;
}

function rotuloDoMes(\DateTimeImmutable $hoje): string
{
    return $hoje->format('m/Y');
}
