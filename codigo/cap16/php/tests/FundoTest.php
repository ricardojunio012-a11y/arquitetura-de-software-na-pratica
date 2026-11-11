<?php
// O fundo de reserva: a formatação em reais e duas saídas simultâneas com a linha
// do fundo travada, que nunca deixam o saldo negativo. O PHP não tem threads, e por
// isso cada saída roda num processo separado (saida_concorrente.php).
require_once __DIR__ . '/../src/banco.php';
require_once __DIR__ . '/../src/fundo.php';
require_once __DIR__ . '/../src/migracoes.php';

use PHPUnit\Framework\TestCase;

use function Morada\{
    aplicarMigracoes,
    conectar,
    prepararFundo,
    reais,
    recriarEsquema,
    saldo,
};

final class FundoTest extends TestCase
{
    public function testReaisFormataCentavosComSeparadorDeMilharESinal(): void
    {
        $this->assertSame('1.000,00', reais(100000));
        $this->assertSame('-300,00', reais(-30000));
        $this->assertSame('0,05', reais(5));
    }

    public function testSaidasSimultaneasComOFundoTravadoNaoDeixamOSaldoNegativo(): void
    {
        if (!getenv('BANCO_URL')) {
            $this->markTestSkipped('sem banco');
        }
        $banco = conectar(getenv('BANCO_URL'));
        recriarEsquema($banco);
        aplicarMigracoes($banco, '/dados/migracoes');
        prepararFundo($banco);
        $processos = [];
        $saidas = [];
        foreach (
            [[70000, 'conserto do portão'], [60000, 'pintura da fachada']]
            as [$valor, $motivo]
        ) {
            $comando = [
                'php',
                __DIR__ . '/saida_concorrente.php',
                (string) $valor,
                $motivo,
            ];
            $processos[] = proc_open($comando, [1 => ['pipe', 'w']], $tubos);
            $saidas[] = $tubos[1];
        }
        $resultados = array_map(fn($tubo) => trim(stream_get_contents($tubo)), $saidas);
        array_map('proc_close', $processos);
        $this->assertSame(1, count(array_keys($resultados, 'registrada')));
        $this->assertGreaterThanOrEqual(0, saldo($banco, 1));
    }
}
