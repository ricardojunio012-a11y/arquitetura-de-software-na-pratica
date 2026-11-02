<?php
// Testes de integração: o repositório contra um PostgreSQL real, em contêiner.
require_once __DIR__ . '/../src/comunicacao/postgres.php';

use Morada\Comunicacao\AvisosNoPostgres;
use PHPUnit\Framework\TestCase;

final class IntegracaoTest extends TestCase
{
    protected function setUp(): void
    {
        if (!getenv('BANCO_URL')) {
            $this->markTestSkipped('sem banco');
        }
    }

    public function testGravaUmAvisoEOEncontraDepois(): void
    {
        $avisos = AvisosNoPostgres::conectar(getenv('BANCO_URL'));
        $this->assertFalse($avisos->jaEnviado('E-1'));
        $avisos->registrar('E-1', 'pagamento recebido');
        $this->assertTrue($avisos->jaEnviado('E-1'));
    }

    public function testOBancoRecusaOMesmoAvisoDuasVezes(): void
    {
        $avisos = AvisosNoPostgres::conectar(getenv('BANCO_URL'));
        $avisos->registrar('E-1', 'pagamento recebido');
        $this->expectException(PDOException::class);
        $avisos->registrar('E-1', 'pagamento recebido');
    }
}
