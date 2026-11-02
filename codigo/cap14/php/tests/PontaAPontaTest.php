<?php
// Teste de ponta a ponta: o cliente do monólito, a API real e o PostgreSQL juntos.
// Poucos, lentos e valiosos: provam que as peças foram ligadas corretamente.
require_once __DIR__ . '/../src/comunicacao/api.php';
require_once __DIR__ . '/../src/comunicacao/postgres.php';
require_once __DIR__ . '/../src/monolito/cliente.php';

use Morada\Comunicacao\AvisosNoPostgres;
use Morada\Monolito\ClienteComunicacao;
use PHPUnit\Framework\TestCase;

use function Morada\Comunicacao\subir;

final class PontaAPontaTest extends TestCase
{
    public function testEnviaOAvisoUmaVezEReconheceOReenvio(): void
    {
        if (!getenv('BANCO_URL')) {
            $this->markTestSkipped('sem banco');
        }
        AvisosNoPostgres::conectar(getenv('BANCO_URL'));
        $api = subir(__DIR__ . '/../src/comunicacao/servidor.php', 8092);
        $cliente = new ClienteComunicacao('http://127.0.0.1:8092');
        $primeiro = $cliente->avisar('E-1', 'pagamento recebido');
        $segundo = $cliente->avisar('E-1', 'pagamento recebido');
        proc_terminate($api);
        $this->assertSame(['ok' => true, 'repetido' => false], $primeiro);
        $this->assertSame(['ok' => true, 'repetido' => true], $segundo);
    }
}
