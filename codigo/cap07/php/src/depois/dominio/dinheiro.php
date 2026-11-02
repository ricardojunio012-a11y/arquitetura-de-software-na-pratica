<?php
// Objeto de valor: imutável, comparado pelo valor e dono das próprias regras.
namespace Morada\Depois\Dominio;

require_once __DIR__ . '/erro.php';

final readonly class Dinheiro
{
    private function __construct(public int $centavos)
    {
        if ($centavos < 0) {
            throw new ErroDeDominio(
                'valor em dinheiro deve ser um número inteiro de centavos',
            );
        }
    }

    public static function deCentavos(int $centavos): self
    {
        return new self($centavos);
    }

    public static function zero(): self
    {
        return new self(0);
    }

    public function somar(Dinheiro $outro): self
    {
        return new self($this->centavos + $outro->centavos);
    }

    // Percentual com arredondamento meio para cima, sempre no mesmo lugar
    public function percentual(int $porcento): self
    {
        return new self(intdiv($this->centavos * $porcento + 50, 100));
    }

    public function igual(Dinheiro $outro): bool
    {
        return $this->centavos === $outro->centavos;
    }

    // R$ 1.234,56
    public function __toString(): string
    {
        return 'R$ ' .
            number_format(intdiv($this->centavos, 100), 0, ',', '.') .
            ',' .
            sprintf('%02d', $this->centavos % 100);
    }
}
