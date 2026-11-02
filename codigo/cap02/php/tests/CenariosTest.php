<?php
// Testes do executor de cenários: verificam a carga e a avaliação, não o tempo.
require_once __DIR__ . '/../src/cenarios.php';

use PHPUnit\Framework\TestCase;
use function Morada\avaliar;
use function Morada\condominioSintetico;
use function Morada\executar;

final class CenariosTest extends TestCase
{
    public function testGeraAsUnidadesComFracoesQueSomamOCondominio(): void
    {
        $unidades = condominioSintetico(1, 40)['unidades'];
        $this->assertCount(40, $unidades);
        $this->assertSame(
            1000000,
            array_sum(array_column($unidades, 'fracaoMilionesimos')),
        );
        $this->assertCount(
            5,
            array_filter($unidades, fn($u) => $u['debitoAnterior'] !== null),
        );
    }

    public function testPassaDentroDoLimiteEFalhaAcima(): void
    {
        $this->assertTrue(avaliar(59.9, 60));
        $this->assertFalse(avaliar(60.1, 60));
    }

    public function testEstimaORegistroPelaCapacidadeDoBanco(): void
    {
        $cenario = [
            'id' => 'T',
            'descricao' => 'teste',
            'condominios' => 3,
            'unidadesPorCondominio' => 10,
            'registrosPorSegundo' => 10,
            'limiteSegundos' => 2,
        ];
        $r = executar(
            $cenario,
            new DateTimeImmutable('2026-03-02', new DateTimeZone('UTC')),
        );
        $this->assertSame(30, $r->cobrancas);
        $this->assertEquals(3, $r->segundosRegistro);
        $this->assertFalse($r->passou); // 3 s de registro não cabem em 2 s
    }
}
