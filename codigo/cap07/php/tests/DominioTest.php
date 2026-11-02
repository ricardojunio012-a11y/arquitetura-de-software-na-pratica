<?php
// Testes: o que o modelo anêmico permite e o que o modelo rico impede.
require_once __DIR__ . '/../src/antes/modelo.php';
require_once __DIR__ . '/../src/depois/dominio/agenda.php';

use Morada\Antes\{Reserva as ReservaAnemica, Reservas};
use Morada\Depois\Dominio\{Agenda, Dinheiro, ErroDeDominio, Periodo, PoliticaDeUso};
use PHPUnit\Framework\TestCase;

final class DominioTest extends TestCase
{
    private function politica(): PoliticaDeUso
    {
        return new PoliticaDeUso(Dinheiro::deCentavos(15000), 2, 1);
    }

    public function testAntesQualquerCodigoPodeGravarUmaReservaSobreposta(): void
    {
        foreach ([['X-1', 14, 22], ['X-2', 20, 23]] as [$id, $inicio, $fim]) {
            $r = new ReservaAnemica();
            $r->id = $id;
            $r->espaco = 'salao';
            $r->data = '2026-03-14';
            $r->inicio = $inicio;
            $r->fim = $fim;
            Reservas::$todas[] = $r;
        }
        $sobrepostas = array_filter(
            Reservas::$todas,
            fn($r) => str_starts_with($r->id, 'X-'),
        );
        $this->assertCount(2, $sobrepostas); // o estado inválido foi aceito
    }

    public function testDepoisAAgendaRecusaUmHorarioSobreposto(): void
    {
        $agenda = new Agenda('salao', $this->politica());
        $agenda->reservar(
            'R-1',
            'A-101',
            new Periodo('2026-03-14', 14, 22),
            '2026-03-02',
        );
        $this->expectException(ErroDeDominio::class);
        $this->expectExceptionMessage('horário sobreposto a R-1');
        $agenda->reservar(
            'R-2',
            'A-202',
            new Periodo('2026-03-14', 20, 23),
            '2026-03-02',
        );
    }

    public function testDepoisNaoExistePeriodoComOFimAntesDoInicio(): void
    {
        $this->expectException(ErroDeDominio::class);
        new Periodo('2026-03-14', 18, 16);
    }

    public function testDepoisDinheiroArredondaMeioParaCimaEEComparadoPeloValor(): void
    {
        $this->assertSame(
            'R$ 90,01',
            (string) Dinheiro::deCentavos(18001)->percentual(50),
        );
        $this->assertTrue(
            Dinheiro::deCentavos(9000)->igual(Dinheiro::deCentavos(9000)),
        );
    }

    public function testDepoisCancelarEmCimaDaHoraGeraMultaEEvento(): void
    {
        $agenda = new Agenda('salao', $this->politica());
        $agenda->reservar(
            'R-1',
            'A-101',
            new Periodo('2026-03-14', 14, 22),
            '2026-03-02',
        );
        $agenda->recolherEventos();
        $this->assertSame('R$ 90,00', (string) $agenda->cancelar('R-1', '2026-03-13'));
        $tipos = array_map(
            fn($e) => (new ReflectionClass($e))->getShortName(),
            $agenda->recolherEventos(),
        );
        $this->assertSame(['ReservaCancelada'], $tipos);
        try {
            $agenda->cancelar('R-99', '2026-03-13');
            $this->fail('deveria recusar uma reserva inexistente');
        } catch (ErroDeDominio $e) {
            $this->assertSame('reserva não encontrada', $e->getMessage());
        }
        $this->expectExceptionMessage('não está confirmada');
        $agenda->cancelar('R-1', '2026-03-13');
    }
}
