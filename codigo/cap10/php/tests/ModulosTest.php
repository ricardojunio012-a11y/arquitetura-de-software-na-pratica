<?php
// Testes: cada módulo testado pela própria API, e Reservas testado sem o Financeiro.
require_once __DIR__ . '/../src/depois/modulos/financeiro/api.php';
require_once __DIR__ . '/../src/depois/modulos/reservas/api.php';

use Morada\Depois\Modulos\Financeiro\Financeiro;
use Morada\Depois\Modulos\Financeiro\Interno\TabelaDeCobrancas;
use Morada\Depois\Modulos\Reservas\{RecusaErro, Reservas, SituacaoFinanceira};
use PHPUnit\Framework\TestCase;

final class ModulosTest extends TestCase
{
    private static function situacao(bool $emDia): SituacaoFinanceira
    {
        return new class ($emDia) implements SituacaoFinanceira {
            public function __construct(private bool $emDia) {}

            public function unidadeEmDia(string $unidade, string $hoje): bool
            {
                return $this->emDia;
            }
        };
    }

    public function testParcelamentoDeixaAUnidadeEmDia(): void
    {
        $financeiro = new Financeiro(new TabelaDeCobrancas());
        $financeiro->emitir('C-1', 'B-101', 58685, '2026-02-10');
        $this->assertFalse($financeiro->unidadeEmDia('B-101', '2026-03-02'));
        $financeiro->parcelar('C-1', 3);
        $this->assertTrue($financeiro->unidadeEmDia('B-101', '2026-03-02'));
    }

    public function testRecusaUnidadeEmDebitoComFinanceiroDeMentira(): void
    {
        $reservas = new Reservas(['salao'], self::situacao(false));
        $this->expectException(RecusaErro::class);
        $reservas->reservar('R-1', 'A-1', 'salao', '2026-03-14', '2026-03-02');
    }

    public function testNaoAceitaDuasReservasDoMesmoEspacoNoMesmoDia(): void
    {
        $reservas = new Reservas(['salao'], self::situacao(true));
        $reservas->reservar('R-1', 'A-1', 'salao', '2026-03-14', '2026-03-02');
        $this->expectExceptionMessage('salao já reservado em 2026-03-14');
        $reservas->reservar('R-2', 'A-2', 'salao', '2026-03-14', '2026-03-02');
    }
}
