<?php
// Observer: quem publica um evento não conhece quem reage a ele.
namespace Morada;

require_once __DIR__ . '/tipos.php';

final readonly class Evento
{
    // $tipo: "ReservaConfirmada" ou "ReservaRecusada"
    public function __construct(
        public string $tipo,
        public Pedido $pedido,
        public ?string $motivo = null,
    ) {}
}

interface Assinante
{
    public function nome(): string;

    public function tratar(Evento $evento): void;
}

final class Barramento
{
    /** @var array<string, Assinante[]> */
    private array $assinantes = [];
    /** @var string[] */
    public array $falhas = [];

    public function assinar(string $tipo, Assinante $assinante): void
    {
        $this->assinantes[$tipo][] = $assinante;
    }

    // Um assinante que falha não impede os outros de receberem o evento
    public function publicar(Evento $evento): void
    {
        foreach ($this->assinantes[$evento->tipo] ?? [] as $assinante) {
            try {
                $assinante->tratar($evento);
            } catch (\Throwable $erro) {
                $this->falhas[] =
                    "{$evento->tipo} {$evento->pedido->id}: " .
                    "{$assinante->nome()}: {$erro->getMessage()}";
            }
        }
    }
}
