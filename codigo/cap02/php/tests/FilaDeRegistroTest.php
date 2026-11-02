<?php
// Testes da simulação da fila de registro: mesma semente, mesmo resultado.
require_once __DIR__ . '/../src/fila_de_registro.php';

use PHPUnit\Framework\TestCase;
use function Morada\Registro\disponiveisAte;
use function Morada\Registro\percentil;
use function Morada\Registro\simular;

final class FilaDeRegistroTest extends TestCase
{
    private const PREMISSAS = [
        'id' => 'T',
        'descricao' => 'teste',
        'boletos' => 1000,
        'boletosPorArquivo' => 250,
        'registrosPorSegundo' => 10,
        'retornoSegundos' => 100,
        'falhaPassageiraPorCento' => 20,
        'recusaDefinitivaACada' => 50,
        'maxTentativas' => 3,
        'limiteSegundos' => 400,
        'semente' => 7,
    ];

    public function testIngenuaCaudaPassaDoLimiteEHaBoletosSemRegistro(): void
    {
        $r = simular(self::PREMISSAS, false);
        $this->assertSame(
            [12, 1246, 26],
            [$r->arquivos, $r->tentativas, $r->semRegistro],
        );
        $this->assertSame(968, disponiveisAte($r, 400));
        $this->assertSame(175, percentil($r, 1000, 500));
        $this->assertNull(percentil($r, 1000, 990)); // o p99 cai nos sem registro
    }

    public function testAjustadaTudoDisponivelNoLimiteParteComPix(): void
    {
        $r = simular(self::PREMISSAS, true);
        $this->assertSame([11, 1199, 32], [$r->arquivos, $r->tentativas, $r->viaPix]);
        $this->assertSame(1000, disponiveisAte($r, 400));
        $this->assertSame(357, percentil($r, 1000, 990));
    }

    public function testMesmaSementeMesmoResultado(): void
    {
        $this->assertEquals(
            simular(self::PREMISSAS, false),
            simular(self::PREMISSAS, false),
        );
    }
}
