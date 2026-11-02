<?php
// Entidade: tem identidade (o id) e ciclo de vida. Só muda pelos próprios métodos.
namespace Morada\Depois\Dominio;

require_once __DIR__ . '/dinheiro.php';
require_once __DIR__ . '/periodo.php';

final class Reserva
{
    private string $situacao = 'confirmada';

    public function __construct(
        public readonly string $id,
        public readonly string $unidade,
        public readonly Periodo $periodo,
        public readonly Dinheiro $taxa,
    ) {}

    public function ativa(): bool
    {
        return $this->situacao === 'confirmada';
    }

    public function cancelar(): void
    {
        if (!$this->ativa()) {
            throw new ErroDeDominio('reserva não está confirmada');
        }
        $this->situacao = 'cancelada';
    }
}
