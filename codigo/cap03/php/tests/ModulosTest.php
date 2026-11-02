<?php
// Testes: o acoplamento escondido do "antes" e o isolamento do "depois".
require_once __DIR__ . '/../src/antes/servicos/servicos.php';
require_once __DIR__ . '/../src/depois/cobranca/cobranca.php';
require_once __DIR__ . '/../src/depois/inadimplencia/inadimplencia.php';

use Morada\Antes\Config\Config;
use Morada\Antes\Servicos\Servicos;
use PHPUnit\Framework\TestCase;
use function Morada\Depois\Cobranca\calcularCobrancas;
use function Morada\Depois\Inadimplencia\relatorioDeInadimplencia;

final class ModulosTest extends TestCase
{
    private function dados(): array
    {
        // Entrada: /dados/entrada no contêiner; fora dele, a pasta do capítulo
        $arquivo = is_file('/dados/entrada/financeiro.json')
            ? '/dados/entrada/financeiro.json'
            : __DIR__ . '/../../entrada/financeiro.json';
        return json_decode(file_get_contents($arquivo), true);
    }

    private function hoje(): DateTimeImmutable
    {
        return new DateTimeImmutable('2026-03-02', new DateTimeZone('UTC'));
    }

    public function testAntesInadimplenciaMudaAOrdemDasCobrancasDeOutroModulo(): void
    {
        Config::$hoje = $this->hoje();
        Config::$dados = $this->dados();
        Servicos::calcularTodas();
        $ordemOriginal = implode(
            ',',
            array_map(fn($c) => $c['unidade']['id'], Servicos::$cobrancas),
        );
        Servicos::gerarSaida('inadimplencia');
        $ordemDepois = implode(
            ',',
            array_map(fn($c) => $c['unidade']['id'], Servicos::$cobrancas),
        );
        $this->assertNotSame($ordemOriginal, $ordemDepois);
    }

    public function testDepoisInadimplenciaNaoAlteraAsCobrancas(): void
    {
        $dados = $this->dados();
        $lista = calcularCobrancas(
            $dados['condominio']['despesasDoMesCentavos'],
            $dados['unidades'],
            $this->hoje(),
        );
        $antes = implode(',', array_map(fn($c) => $c->unidade, $lista));
        relatorioDeInadimplencia('Teste', $this->hoje(), $lista);
        $this->assertSame(
            $antes,
            implode(',', array_map(fn($c) => $c->unidade, $lista)),
        );
    }

    public function testDepoisCalculaEncargosSemConfiguracaoGlobal(): void
    {
        [$carla] = calcularCobrancas(
            485000,
            [$this->dados()['unidades'][2]],
            $this->hoje(),
        );
        $this->assertSame(
            [20, 1335, 445],
            [$carla->diasDeAtraso, $carla->multa, $carla->juros],
        );
    }
}
