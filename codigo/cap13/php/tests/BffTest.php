<?php
// Testes: a tela inicial numa chamada, o lote idempotente e o conflito detectado.
require_once __DIR__ . '/../src/bff.php';

use Morada\{BffPorteiro, Portaria, Reservas};
use PHPUnit\Framework\TestCase;

final class BffTest extends TestCase
{
    private const ENTREGAR = [
        'id' => 'op-A1',
        'tipo' => 'entregar',
        'encomenda' => 'E-1',
        'versaoVista' => 1,
        'hora' => '09:00',
    ];

    private function montar(): BffPorteiro
    {
        return new BffPorteiro(
            new Portaria([['encomenda' => 'E-1', 'unidade' => 'A-1']]),
            new Reservas([
                ['reserva' => 'R-1', 'espaco' => 'salao', 'nomes' => ['Ana']],
            ]),
        );
    }

    public function testMontaATelaInicialNumaChamada(): void
    {
        $tela = $this->montar()->inicio();
        $this->assertSame('E-1', $tela['encomendasPendentes'][0]['encomenda']);
        $this->assertSame('Ana', $tela['visitantesEsperados'][0]['nome']);
    }

    public function testNaoConfundeVisitanteComOutroCujoNomeContemODele(): void
    {
        $bff = new BffPorteiro(
            new Portaria([]),
            new Reservas([
                [
                    'reserva' => 'R-1',
                    'espaco' => 'salao',
                    'nomes' => ['Ana', 'Maria Ana'],
                ],
            ]),
        );
        $bff->sincronizar('A', [
            [
                'id' => 'op-A1',
                'tipo' => 'registrarVisitante',
                'nome' => 'Maria Ana',
                'reserva' => 'R-1',
                'hora' => '09:00',
            ],
        ]);
        $esperados = array_column($bff->inicio()['visitantesEsperados'], 'nome');
        $this->assertSame(['Ana'], $esperados);
    }

    public function testComResultadosPersistidosReconheceOLoteDepoisDeReiniciar(): void
    {
        $portaria = new Portaria([['encomenda' => 'E-1', 'unidade' => 'A-1']]);
        $reservas = new Reservas([]);
        $tabela = new ArrayObject();
        (new BffPorteiro($portaria, $reservas, $tabela))->sincronizar('A', [
            self::ENTREGAR,
        ]);
        $depois = new BffPorteiro($portaria, $reservas, $tabela);
        [[, $resultado]] = $depois->sincronizar('A', [self::ENTREGAR]);
        $this->assertSame('aplicada', $resultado);
        $this->assertSame(1, $depois->repetidas);
    }

    public function testNaoAplicaDuasVezesUmLoteReenviado(): void
    {
        $bff = $this->montar();
        $bff->sincronizar('A', [self::ENTREGAR]);
        [[, $resultado]] = $bff->sincronizar('A', [self::ENTREGAR]);
        $this->assertSame('aplicada', $resultado);
        $this->assertSame(1, $bff->repetidas);
    }

    public function testAcusaConflitoQuandoAEncomendaMudou(): void
    {
        $bff = $this->montar();
        $bff->sincronizar('B', [
            ['id' => 'op-B1', 'tipo' => 'devolver'] + self::ENTREGAR,
        ]);
        [[, $resultado]] = $bff->sincronizar('A', [self::ENTREGAR]);
        $this->assertSame(
            'conflito: E-1 já devolvida pelo tablet B às 09:00',
            $resultado,
        );
    }
}
