<?php
// Chain of Responsibility: cada etapa verifica uma regra e, se o pedido passar,
// entrega para a próxima. O esqueleto de avaliar() é um Template Method.
namespace Morada;

require_once __DIR__ . '/repositorio.php';

abstract class Etapa
{
    private ?Etapa $proxima = null;

    // Devolve a próxima etapa, para encadear: $a->depois($b)->depois($c)
    public function depois(Etapa $proxima): Etapa
    {
        $this->proxima = $proxima;
        return $proxima;
    }

    public function avaliar(Pedido $pedido): Decisao
    {
        $motivo = $this->verificar($pedido);
        if ($motivo !== null) {
            return new Decisao(false, $motivo);
        }
        return $this->proxima?->avaliar($pedido) ?? new Decisao(true);
    }

    // Cada etapa diz o motivo da recusa, ou null se o pedido passou
    abstract protected function verificar(Pedido $pedido): ?string;
}

final class UnidadeEmDia extends Etapa
{
    protected function verificar(Pedido $pedido): ?string
    {
        return $pedido->unidade->emDebito ? 'unidade com débito em aberto' : null;
    }
}

final class AntecedenciaMinima extends Etapa
{
    public function __construct(private readonly \DateTimeImmutable $hoje) {}

    protected function verificar(Pedido $pedido): ?string
    {
        $minimo = $pedido->espaco->antecedenciaMinimaDias;
        if (diasEntre($this->hoje, $pedido->data) >= $minimo) {
            return null;
        }
        return "antecedência mínima de $minimo dias";
    }
}

final class EspacoLivre extends Etapa
{
    public function __construct(private readonly RepositorioDeReservas $reservas) {}

    protected function verificar(Pedido $pedido): ?string
    {
        $ocupado = $this->reservas->ocupado($pedido->espaco->id, $pedido->data);
        return $ocupado ? 'espaço já reservado nesta data' : null;
    }
}

final class LimitePorMes extends Etapa
{
    public function __construct(private readonly RepositorioDeReservas $reservas) {}

    protected function verificar(Pedido $pedido): ?string
    {
        $feitas = $this->reservas->contarNoMes(
            $pedido->unidade->id,
            $pedido->espaco->id,
            substr($pedido->data, 0, 7),
        );
        if ($feitas < $pedido->espaco->limitePorMes) {
            return null;
        }
        return 'limite de reservas do mês atingido';
    }
}
