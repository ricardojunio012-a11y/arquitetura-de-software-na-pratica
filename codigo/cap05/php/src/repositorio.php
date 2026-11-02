<?php
// Repository: quem usa as reservas não sabe onde elas ficam guardadas.
namespace Morada;

require_once __DIR__ . '/tipos.php';
require_once __DIR__ . '/estado.php';

interface RepositorioDeReservas
{
    public function salvar(Reserva $reserva): void;

    // Verifica e grava numa operação só: no banco, uma restrição de unicidade
    public function salvarSeLivre(Reserva $reserva): bool;

    public function buscar(string $id): ?Reserva;

    public function ocupado(string $espaco, string $data): bool;

    public function contarNoMes(string $unidade, string $espaco, string $mes): int;
}

// Em memória para o laboratório; o capítulo 16 troca por um banco de dados.
// Guarda todas as reservas; as consultas só contam as aprovadas.
final class RepositorioEmMemoria implements RepositorioDeReservas
{
    /** @var Reserva[] */
    private array $reservas = [];

    public function salvar(Reserva $reserva): void
    {
        $this->reservas[] = $reserva;
    }

    public function salvarSeLivre(Reserva $reserva): bool
    {
        if ($this->ocupado($reserva->pedido->espaco->id, $reserva->pedido->data)) {
            return false;
        }
        $this->salvar($reserva);
        return true;
    }

    public function buscar(string $id): ?Reserva
    {
        foreach ($this->reservas as $r) {
            if ($r->pedido->id === $id) {
                return $r;
            }
        }
        return null;
    }

    public function ocupado(string $espaco, string $data): bool
    {
        foreach ($this->aprovadas() as $p) {
            if ($p->espaco->id === $espaco && $p->data === $data) {
                return true;
            }
        }
        return false;
    }

    public function contarNoMes(string $unidade, string $espaco, string $mes): int
    {
        return count(
            array_filter(
                $this->aprovadas(),
                fn(Pedido $p) => $p->unidade->id === $unidade &&
                    $p->espaco->id === $espaco &&
                    str_starts_with($p->data, $mes),
            ),
        );
    }

    /** @return Pedido[] */
    private function aprovadas(): array
    {
        $aprovadas = [];
        foreach ($this->reservas as $r) {
            if ($r->estado() === 'aprovada') {
                $aprovadas[] = $r->pedido;
            }
        }
        return $aprovadas;
    }
}
