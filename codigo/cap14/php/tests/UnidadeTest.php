<?php
// Testes de unidade: a regra do serviço, sem rede e sem banco. Rodam em milissegundos.
require_once __DIR__ . '/../src/comunicacao/dominio.php';

use Morada\Comunicacao\{AvisosEmMemoria, Comunicacao, DadosInvalidosErro};
use PHPUnit\Framework\TestCase;

final class UnidadeTest extends TestCase
{
    public function testEnviaUmAvisoNovo(): void
    {
        $comunicacao = new Comunicacao(new AvisosEmMemoria());
        $this->assertSame('enviado', $comunicacao->avisar('E-1', 'pagamento recebido'));
    }

    public function testReconheceUmAvisoRepetido(): void
    {
        $comunicacao = new Comunicacao(new AvisosEmMemoria());
        $comunicacao->avisar('E-1', 'pagamento recebido');
        $this->assertSame(
            'repetido',
            $comunicacao->avisar('E-1', 'pagamento recebido'),
        );
    }

    public function testRecusaUmAvisoSemTexto(): void
    {
        $this->expectException(DadosInvalidosErro::class);
        (new Comunicacao(new AvisosEmMemoria()))->avisar('E-1', '');
    }
}
