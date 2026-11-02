<?php
// Testes: cada camada pode ser testada sem as de cima; o núcleo, sem plugins reais.
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/camadas/apresentacao/api.php';
require_once __DIR__ . '/../src/plugins/nucleo.php';

use Morada\Camadas\Aplicacao\ServicoDeReservas;
use Morada\Camadas\Dados\RepositorioDeAgendas;
use Morada\Camadas\Dominio\{Agenda, Espaco, RegraVioladaErro};
use Morada\Plugins\{Cobranca, Nucleo, PluginDeBanco};
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\{ServerRequestFactory, StreamFactory};

use function Morada\Camadas\Apresentacao\criarApi;

final class EstilosTest extends TestCase
{
    private function salao(): Espaco
    {
        return new Espaco('salao', 15000, 2);
    }

    public function testODominioRecusaHorarioSobrepostoSemSaberQueExisteHttp(): void
    {
        $agenda = new Agenda($this->salao());
        $agenda->reservar('R-1', 'A-101', '2026-03-14', 14, 22, '2026-03-02');
        $this->expectException(RegraVioladaErro::class);
        $agenda->reservar('R-2', 'A-202', '2026-03-14', 20, 23, '2026-03-02');
    }

    public function testAApresentacaoTraduzARegraVioladaEm409(): void
    {
        $api = criarApi(
            new ServicoDeReservas(new RepositorioDeAgendas([$this->salao()])),
        );
        $corpo = [
            'reserva' => 'R-1',
            'unidade' => 'A-101',
            'espaco' => 'salao',
            'data' => '2026-03-03',
            'inicio' => 10,
            'fim' => 12,
            'em' => '2026-03-02',
        ];
        $req = (new ServerRequestFactory())
            ->createServerRequest('POST', '/reservas')
            ->withHeader('Content-Type', 'application/json')
            ->withBody((new StreamFactory())->createStream(json_encode($corpo)));
        $this->assertSame(409, $api->handle($req)->getStatusCode());
    }

    private function plugin(string $nome, callable $registrar): PluginDeBanco
    {
        return new class ($nome, $registrar) implements PluginDeBanco {
            public function __construct(private string $n, private $r) {}

            public function nome(): string
            {
                return $this->n;
            }

            public function registrar(Cobranca $cobranca): string
            {
                return ($this->r)($cobranca);
            }
        };
    }

    public function testEmitePeloPluginInstaladoEAvisaQuandoFaltaPlugin(): void
    {
        $nucleo = new Nucleo();
        $nucleo->instalar($this->plugin('teste', fn($c) => "T-{$c->unidade}"));
        $this->assertSame(
            'A-1;R$ 1,00;teste;T-A-1',
            $nucleo->emitir(new Cobranca('A-1', 100, 'teste')),
        );
        $this->assertSame(
            'A-1;R$ 1,00;zeta;sem plugin para o banco zeta',
            $nucleo->emitir(new Cobranca('A-1', 100, 'zeta')),
        );
    }

    public function testUmPluginComDefeitoNaoDerrubaONucleo(): void
    {
        $nucleo = new Nucleo();
        $nucleo->instalar(
            $this->plugin('quebrado', fn() => throw new RuntimeException('fora do ar')),
        );
        $this->assertSame(
            'A-1;R$ 1,00;quebrado;falha no plugin quebrado: fora do ar',
            $nucleo->emitir(new Cobranca('A-1', 100, 'quebrado')),
        );
    }

    public function testRecusaUmPluginQueNaoCumpreOContrato(): void
    {
        $this->expectExceptionMessage('contrato');
        (new Nucleo())->instalar(new stdClass());
    }
}
