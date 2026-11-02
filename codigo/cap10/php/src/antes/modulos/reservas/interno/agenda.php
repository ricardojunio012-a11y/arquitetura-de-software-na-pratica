<?php
// Dado privado de Reservas: um espaço, uma reserva por dia (simplificado).
namespace Morada\Antes\Modulos\Reservas\Interno;

final class Agenda
{
    /** @var array<string, string> */
    private array $ocupacao = [];

    public function __construct(private readonly array $espacos) {}

    public function ocupante(string $espaco, string $data): ?string
    {
        if (!in_array($espaco, $this->espacos, true)) {
            throw new \RuntimeException("espaço $espaco não existe");
        }
        return $this->ocupacao["$espaco $data"] ?? null;
    }

    public function registrar(string $reserva, string $espaco, string $data): void
    {
        $this->ocupacao["$espaco $data"] = $reserva;
    }
}
