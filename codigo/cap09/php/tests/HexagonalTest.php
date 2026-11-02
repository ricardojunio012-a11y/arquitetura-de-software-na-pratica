<?php
// Testes: o núcleo sem nenhum adaptador real, os adaptadores sem o núcleo real e o
// mesmo contrato verificado nos dois repositórios.
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/aplicacao/servico-de-reservas.php';
require_once __DIR__ . '/../src/adaptadores/saida/em-memoria.php';
require_once __DIR__ . '/../src/adaptadores/saida/postgres.php';
require_once __DIR__ . '/../src/adaptadores/entrada/cli.php';

use Morada\Adaptadores\Saida\{AgendasEmMemoria, AgendasNoPostgres};
use Morada\Aplicacao\{CasosDeUsoDeReservas, RepositorioDeAgendas, ServicoDeReservas};
use Morada\Dominio\{Espaco, NaoEncontradoErro, RegraVioladaErro};
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

use function Morada\Adaptadores\Entrada\executar;

final class HexagonalTest extends TestCase
{
    private static function salao(): Espaco
    {
        return new Espaco('salao', 15000, 2);
    }

    private const PEDIDO = [
        'reserva' => 'R-1',
        'unidade' => 'A-101',
        'espaco' => 'salao',
        'data' => '2026-03-14',
        'inicio' => 14,
        'fim' => 22,
        'em' => '2026-03-02',
    ];

    public function testONucleoReservaERecusaSobreposicaoSoComMemoria(): void
    {
        $servico = new ServicoDeReservas(new AgendasEmMemoria([self::salao()]));
        $this->assertSame('R$ 180,00', $servico->reservar(self::PEDIDO)['taxa']);
        $this->expectException(RegraVioladaErro::class);
        $servico->reservar(['reserva' => 'R-2'] + self::PEDIDO);
    }

    public function testOAdaptadorDeLinhaDeComandoNaoPrecisaDoNucleoDeVerdade(): void
    {
        $falso = new class implements CasosDeUsoDeReservas {
            public array $chamadas = [];

            public function listarEspacos(): array
            {
                return [];
            }

            public function reservar(array $pedido): array
            {
                return [];
            }

            public function cancelar(string $reserva, string $em): array
            {
                $this->chamadas[] = "$reserva $em";
                return ['reserva' => $reserva, 'multa' => 'R$ 0,00'];
            }

            public function reservasDoEspaco(string $espaco): array
            {
                return [];
            }
        };
        $resultado = executar($falso, ['cancelar', 'R-7', '2026-03-01']);
        $this->assertSame(['R-7 2026-03-01'], $falso->chamadas);
        $this->assertSame(['R-7 cancelada, multa R$ 0,00', 0], $resultado);
    }

    public static function repositorios(): array
    {
        $casos = ['em memória' => [fn() => new AgendasEmMemoria([self::salao()])]];
        // No contêiner, o banco existe; fora dele, o caso do PostgreSQL fica de fora
        if (getenv('BANCO_URL')) {
            $casos['PostgreSQL'] = [
                function () {
                    $u = parse_url(getenv('BANCO_URL'));
                    $banco = new PDO(
                        "pgsql:host={$u['host']};port={$u['port']};dbname=" .
                            ltrim($u['path'], '/'),
                        $u['user'],
                        $u['pass'],
                        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
                    );
                    $agendas = new AgendasNoPostgres($banco, [self::salao()]);
                    $agendas->preparar();
                    return $agendas;
                },
            ];
        }
        return $casos;
    }

    // O mesmo contrato vale para qualquer adaptador da porta de saída
    #[DataProvider('repositorios')]
    public function testContratoGuardaAAgendaEAEncontraPelaReserva(
        callable $criar,
    ): void {
        /** @var RepositorioDeAgendas $agendas */
        $agendas = $criar();
        $agenda = $agendas->doEspaco('salao');
        $agenda->reservar('R-1', 'A-101', '2026-03-14', 14, 22, '2026-03-02');
        $agendas->salvar($agenda);
        $ids = array_map(fn($r) => $r->id, $agendas->daReserva('R-1')->reservas());
        $this->assertSame(['R-1'], $ids);
    }

    #[DataProvider('repositorios')]
    public function testContratoAvisaQuandoAReservaNaoExiste(callable $criar): void
    {
        $this->expectException(NaoEncontradoErro::class);
        $criar()->daReserva('R-9');
    }
}
