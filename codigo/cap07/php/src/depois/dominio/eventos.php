<?php
// Eventos de domínio: fatos que já aconteceram, com o vocabulário do negócio.
namespace Morada\Depois\Dominio;

require_once __DIR__ . '/dinheiro.php';
require_once __DIR__ . '/periodo.php';

final readonly class ReservaConfirmada
{
    public function __construct(
        public string $reserva,
        public string $espaco,
        public Periodo $periodo,
        public string $unidade,
        public Dinheiro $taxa,
    ) {}
}

final readonly class ReservaCancelada
{
    public function __construct(public string $reserva, public Dinheiro $multa) {}
}
