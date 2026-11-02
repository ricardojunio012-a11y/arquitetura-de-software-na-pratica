<?php
// Testes: os assinantes são idempotentes e independentes uns dos outros.
require_once __DIR__ . '/../src/eventos.php';
require_once __DIR__ . '/../src/modulos/reservas.php';
require_once __DIR__ . '/../src/modulos/comunicacao.php';

use Morada\Modulos\{Comunicacao, Reservas};
use PHPUnit\Framework\TestCase;

use function Morada\eventoDe;

final class EventosTest extends TestCase
{
    private static function evento(): array
    {
        return eventoDe([
            'pagamento' => 'P-1',
            'unidade' => 'A-1',
            'reserva' => 'R-1',
            'valorCentavos' => 18000,
        ]);
    }

    public function testConfirmamAReservaEAvisamOMorador(): void
    {
        $reservas = new Reservas([
            [
                'reserva' => 'R-1',
                'unidade' => 'A-1',
                'espaco' => 'salao',
                'data' => '2026-03-14',
            ],
        ]);
        $comunicacao = new Comunicacao();
        $reservas->aoConfirmarPagamento(self::evento());
        $comunicacao->aoConfirmarPagamento(self::evento());
        $this->assertSame(['R-1;A-1;salao;2026-03-14;confirmada'], $reservas->linhas());
        $this->assertCount(1, $comunicacao->avisos);
    }

    public function testIgnoramOMesmoEventoEntregueDuasVezes(): void
    {
        $comunicacao = new Comunicacao();
        $comunicacao->aoConfirmarPagamento(self::evento());
        $comunicacao->aoConfirmarPagamento(self::evento());
        $this->assertCount(1, $comunicacao->avisos);
        $this->assertSame(
            'comunicacao ignorou E-P-1 (repetido)',
            $comunicacao->registro[1],
        );
    }
}
