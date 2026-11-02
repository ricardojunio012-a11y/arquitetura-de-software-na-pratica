<?php
// Testes: o módulo de Comunicação é o mesmo dentro e fora do monólito.
require_once __DIR__ . '/../src/comunicacao.php';

use Morada\Comunicacao;
use PHPUnit\Framework\TestCase;

final class ComunicacaoTest extends TestCase
{
    public function testEnviaCadaAvisoUmaVezSoMesmoPedidoDeNovo(): void
    {
        $comunicacao = new Comunicacao();
        $this->assertTrue($comunicacao->avisar('E-P-001', 'pagamento recebido'));
        $this->assertFalse($comunicacao->avisar('E-P-001', 'pagamento recebido'));
        $this->assertTrue($comunicacao->avisar('E-P-002', 'pagamento recebido'));
    }
}
