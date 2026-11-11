<?php
// As migrações rodam uma vez cada, em ordem, e uma segunda execução não faz nada.
require_once __DIR__ . '/../src/banco.php';
require_once __DIR__ . '/../src/migracoes.php';

use PHPUnit\Framework\TestCase;

use function Morada\{aplicarMigracoes, conectar, recriarEsquema};

final class MigracoesTest extends TestCase
{
    public function testAplicamCadaArquivoUmaUnicaVezEmOrdem(): void
    {
        if (!getenv('BANCO_URL')) {
            $this->markTestSkipped('sem banco');
        }
        $banco = conectar(getenv('BANCO_URL'));
        recriarEsquema($banco);
        $this->assertSame(
            [
                '001_cobrancas.sql',
                '002_fundo_de_reserva.sql',
                '003_indice_inadimplencia.sql',
            ],
            aplicarMigracoes($banco, '/dados/migracoes'),
        );
        $this->assertSame([], aplicarMigracoes($banco, '/dados/migracoes'));
    }
}
