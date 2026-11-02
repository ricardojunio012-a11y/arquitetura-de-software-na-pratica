<?php
// Objeto de valor: um período de uso num dia. O fim nunca vem antes do início.
namespace Morada\Depois\Dominio;

require_once __DIR__ . '/erro.php';

final readonly class Periodo
{
    public function __construct(
        public string $data,
        public int $inicio,
        public int $fim,
    ) {
        if ($fim <= $inicio) {
            throw new ErroDeDominio(
                'período inválido: o fim deve ser depois do início',
            );
        }
    }

    public function sobrepoe(Periodo $outro): bool
    {
        return $this->data === $outro->data &&
            $this->inicio < $outro->fim &&
            $outro->inicio < $this->fim;
    }

    public function mes(): string
    {
        return substr($this->data, 0, 7);
    }

    public function diasDesde(string $dia): int
    {
        return intdiv(
            strtotime($this->data . ' UTC') - strtotime($dia . ' UTC'),
            86400,
        );
    }

    public function ehFimDeSemana(): bool
    {
        $diaDaSemana = (int) gmdate('w', strtotime($this->data . ' UTC'));
        return $diaDaSemana === 0 || $diaDaSemana === 6;
    }

    public function __toString(): string
    {
        return "{$this->data} {$this->inicio}h-{$this->fim}h";
    }
}
