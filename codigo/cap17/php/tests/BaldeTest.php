<?php
// O balde de fichas: deixa passar a rajada, recusa o excesso e se recompõe com o tempo.
require_once __DIR__ . '/../src/balde.php';

use Morada\BaldeDeFichas;
use PHPUnit\Framework\TestCase;

final class BaldeTest extends TestCase
{
    public function testPermiteARajadaRecusaOExcessoEGanhaFichasComOTempo(): void
    {
        $balde = new BaldeDeFichas(10, 20);
        for ($i = 0; $i < 10; $i++) {
            $this->assertTrue($balde->permite(0));
        }
        $this->assertFalse($balde->permite(0));
        // 20 fichas por segundo: uma ficha a cada 50 ms
        $this->assertFalse($balde->permite(49));
        $this->assertTrue($balde->permite(99));
    }
}
