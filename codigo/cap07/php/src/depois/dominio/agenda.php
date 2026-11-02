<?php
// Agregado: a agenda de um espaço é a fronteira de consistência. As regras que
// envolvem várias reservas (sobreposição, limite por unidade) só são garantidas
// por quem conhece todas elas. Ninguém de fora altera uma reserva sem passar por aqui.
namespace Morada\Depois\Dominio;

require_once __DIR__ . '/reserva.php';
require_once __DIR__ . '/eventos.php';

final readonly class PoliticaDeUso
{
    public function __construct(
        public Dinheiro $taxa,
        public int $antecedenciaMinimaDias,
        public int $limitePorMes,
    ) {}
}

final class Agenda
{
    private const ACRESCIMO_FIM_DE_SEMANA_PORCENTO = 20;
    private const MULTA_CANCELAMENTO_PORCENTO = 50;
    private const PRAZO_CANCELAMENTO_SEM_MULTA_DIAS = 2;

    /** @var Reserva[] */
    private array $reservas = [];
    private array $eventos = [];

    public function __construct(
        public readonly string $espaco,
        private readonly PoliticaDeUso $politica,
    ) {}

    public function reservar(
        string $id,
        string $unidade,
        Periodo $periodo,
        string $hoje,
    ): Reserva {
        if ($periodo->diasDesde($hoje) < $this->politica->antecedenciaMinimaDias) {
            throw new ErroDeDominio('antecedência mínima não respeitada');
        }
        foreach ($this->ativas() as $r) {
            if ($r->periodo->sobrepoe($periodo)) {
                throw new ErroDeDominio("horário sobreposto a {$r->id}");
            }
        }
        $doMes = array_filter(
            $this->ativas(),
            fn(Reserva $r) => $r->unidade === $unidade &&
                $r->periodo->mes() === $periodo->mes(),
        );
        if (count($doMes) >= $this->politica->limitePorMes) {
            throw new ErroDeDominio('limite mensal da unidade atingido');
        }
        $reserva = new Reserva($id, $unidade, $periodo, $this->taxaPara($periodo));
        $this->reservas[] = $reserva;
        $this->eventos[] = new ReservaConfirmada(
            $id,
            $this->espaco,
            $periodo,
            $unidade,
            $reserva->taxa,
        );
        return $reserva;
    }

    public function cancelar(string $id, string $hoje): Dinheiro
    {
        $reserva = null;
        foreach ($this->reservas as $r) {
            if ($r->id === $id) {
                $reserva = $r;
            }
        }
        if ($reserva === null) {
            throw new ErroDeDominio('reserva não encontrada');
        }
        $reserva->cancelar();
        $emCimaDaHora =
            $reserva->periodo->diasDesde($hoje) <
            self::PRAZO_CANCELAMENTO_SEM_MULTA_DIAS;
        $multa = $emCimaDaHora
            ? $reserva->taxa->percentual(self::MULTA_CANCELAMENTO_PORCENTO)
            : Dinheiro::zero();
        $this->eventos[] = new ReservaCancelada($id, $multa);
        return $multa;
    }

    public function tem(string $id): bool
    {
        foreach ($this->reservas as $r) {
            if ($r->id === $id) {
                return true;
            }
        }
        return false;
    }

    /** @return Reserva[] */
    public function ativas(): array
    {
        return array_values(
            array_filter($this->reservas, fn(Reserva $r) => $r->ativa()),
        );
    }

    // Quem salva o agregado recolhe os eventos para publicá-los depois
    public function recolherEventos(): array
    {
        $eventos = $this->eventos;
        $this->eventos = [];
        return $eventos;
    }

    private function taxaPara(Periodo $periodo): Dinheiro
    {
        $taxa = $this->politica->taxa;
        if (!$periodo->ehFimDeSemana()) {
            return $taxa;
        }
        return $taxa->somar($taxa->percentual(self::ACRESCIMO_FIM_DE_SEMANA_PORCENTO));
    }
}
