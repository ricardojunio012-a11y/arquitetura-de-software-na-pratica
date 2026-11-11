<?php
// Row-Level Security no PostgreSQL: uma consulta sem filtro só enxerga o condomínio
// da transação, e gravar no condomínio de outro é recusado. A administradora
// enxerga os condomínios que administra, e só eles.
require_once __DIR__ . '/../src/banco.php';

use PHPUnit\Framework\TestCase;

use function Morada\{comoAdministradora, comoCondominio, conectar};

final class RlsTest extends TestCase
{
    public function testIsolaLeituraEEscritaPorCondominio(): void
    {
        if (!getenv('BANCO_URL')) {
            $this->markTestSkipped('sem banco');
        }
        $admin = conectar(getenv('BANCO_URL'));
        $admin->exec(file_get_contents('/dados/sql/esquema.sql'));
        $admin->exec(file_get_contents('/dados/sql/rls.sql'));
        $app = conectar(getenv('APP_BANCO_URL'));
        $condominios = comoCondominio(
            $app,
            15,
            fn() => $app
                ->query('SELECT DISTINCT condominio_id FROM cobrancas')
                ->fetchAll(PDO::FETCH_COLUMN),
        );
        $this->assertSame([15], $condominios);
        $this->expectException(PDOException::class);
        $this->expectExceptionCode('42501');
        comoCondominio(
            $app,
            15,
            fn() => $app->exec(
                'INSERT INTO cobrancas (condominio_id, unidade, morador, valor_centavos, situacao) ' .
                    "VALUES (20, 'B-1', 'Íris Melo', 61000, 'aberta')",
            ),
        );
    }

    public function testAAdministradoraVeOsCondominiosQueAdministraESoEles(): void
    {
        if (!getenv('BANCO_URL')) {
            $this->markTestSkipped('sem banco');
        }
        $admin = conectar(getenv('BANCO_URL'));
        $admin->exec(file_get_contents('/dados/sql/esquema.sql'));
        $admin->exec(file_get_contents('/dados/sql/rls.sql'));
        $app = conectar(getenv('APP_BANCO_URL'));
        $condominios = comoAdministradora(
            $app,
            3,
            fn() => $app
                ->query('SELECT DISTINCT condominio_id FROM cobrancas ORDER BY 1')
                ->fetchAll(PDO::FETCH_COLUMN),
        );
        $this->assertSame([12, 15], $condominios);
    }
}
