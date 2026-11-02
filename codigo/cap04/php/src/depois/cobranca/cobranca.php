<?php
// A cobrança de uma unidade. Especialista na informação (GRASP): quem tem os
// lançamentos é quem calcula os totais.
namespace Morada\Depois\Cobranca;

require_once __DIR__ . '/tipos.php';

final readonly class Cobranca
{
    /** @param Lancamento[] $lancamentos */
    public function __construct(
        public string $unidade,
        public string $morador,
        public array $lancamentos,
    ) {}

    public function total(): int
    {
        return $this->soma(false);
    }

    // Desconto condicional, em valor positivo
    public function desconto(): int
    {
        return -$this->soma(true);
    }

    private function soma(bool $condicional): int
    {
        $total = 0;
        foreach ($this->lancamentos as $l) {
            if ($l->condicional === $condicional) {
                $total += $l->valor;
            }
        }
        return $total;
    }
}
