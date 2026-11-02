<?php
// State: o que se pode fazer com uma reserva depende do estado em que ela está.
// Cada estado é um objeto que sabe quais transições aceita; a reserva só repassa.
namespace Morada;

require_once __DIR__ . '/tipos.php';

abstract class Estado
{
    abstract public function nome(): string;

    // Por padrão, nenhuma transição é permitida; cada estado libera as suas
    public function aprovar(Reserva $reserva): void
    {
        $this->recusarTransicao('aprovar');
    }

    public function recusar(Reserva $reserva): void
    {
        $this->recusarTransicao('recusar');
    }

    public function cancelar(Reserva $reserva): void
    {
        $this->recusarTransicao('cancelar');
    }

    private function recusarTransicao(string $acao): never
    {
        throw new \DomainException("não é possível $acao uma reserva {$this->nome()}");
    }
}

final class Pendente extends Estado
{
    public function nome(): string
    {
        return 'pendente';
    }

    public function aprovar(Reserva $reserva): void
    {
        $reserva->mudarPara(new Aprovada());
    }

    public function recusar(Reserva $reserva): void
    {
        $reserva->mudarPara(new Recusada());
    }

    public function cancelar(Reserva $reserva): void
    {
        $reserva->mudarPara(new Cancelada());
    }
}

final class Aprovada extends Estado
{
    public function nome(): string
    {
        return 'aprovada';
    }

    public function cancelar(Reserva $reserva): void
    {
        $reserva->mudarPara(new Cancelada());
    }
}

final class Recusada extends Estado
{
    public function nome(): string
    {
        return 'recusada';
    }
}

final class Cancelada extends Estado
{
    public function nome(): string
    {
        return 'cancelada';
    }
}

final class Reserva
{
    private Estado $estado;

    public function __construct(public readonly Pedido $pedido)
    {
        $this->estado = new Pendente();
    }

    public function estado(): string
    {
        return $this->estado->nome();
    }

    public function aprovar(): void
    {
        $this->estado->aprovar($this);
    }

    public function recusar(): void
    {
        $this->estado->recusar($this);
    }

    public function cancelar(): void
    {
        $this->estado->cancelar($this);
    }

    // Usado só pelos estados
    public function mudarPara(Estado $estado): void
    {
        $this->estado = $estado;
    }
}
