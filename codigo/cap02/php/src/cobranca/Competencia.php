<?php
// O mês de referência da cobrança e as datas que dependem dele.
namespace Morada\Cobranca;

final class Competencia
{
    public function __construct(
        public readonly \DateTimeImmutable $hoje,
        public readonly string $rotulo, // "03/2026"
        public readonly string $codigo, // "202603"
        public readonly string $vencimento, // "10/03/2026"
        public readonly string $limiteDesconto,
    ) {
        // "05/03/2026"
    }

    public static function de(\DateTimeImmutable $hoje): self
    {
        $ano = $hoje->format('Y');
        $mes = $hoje->format('m');
        return new self($hoje, "$mes/$ano", "$ano$mes", "10/$mes/$ano", "05/$mes/$ano");
    }

    // Dias corridos entre uma data (AAAA-MM-DD) e hoje
    public static function diasDesde(string $dataIso, \DateTimeImmutable $hoje): int
    {
        return (new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC')))->diff(
            $hoje,
        )->days;
    }
}
