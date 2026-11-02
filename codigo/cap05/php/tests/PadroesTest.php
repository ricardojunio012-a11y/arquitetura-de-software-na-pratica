<?php
// Testes: cada padrão isolado, com dublês no lugar dos provedores.
require_once __DIR__ . '/../src/assinantes.php';
require_once __DIR__ . '/../src/servico.php';

use Morada\{AntecedenciaMinima, Assinante, Barramento, ComRegistro, ComRetentativas};
use Morada\{Decisao, Espaco, Evento, FabricaDeCanais, Mensagem, Morador, Pedido};
use Morada\{ProvedorSimulado, Sms, Unidade, UnidadeEmDia};
use Morada\{Email, RepositorioEmMemoria, Reserva};
use PHPUnit\Framework\TestCase;

final class PadroesTest extends TestCase
{
    private function morador(string $canal = 'sms'): Morador
    {
        return new Morador('Diego', 'd@x.com', $canal, '+55');
    }

    private function pedido(bool $emDebito = false, string $data = '2026-03-03'): Pedido
    {
        $unidade = new Unidade('A-1', $emDebito, $this->morador());
        return new Pedido(
            'R-1',
            $unidade,
            new Espaco('salao', 'Salão', 15000, 2, 1),
            $data,
        );
    }

    public function testDecoratorRetentativasPorForaERegistroPorDentro(): void
    {
        $provedor = new ProvedorSimulado(['+55' => 2]);
        $registro = [];
        $esperas = [];
        $canal = new ComRetentativas(
            new ComRegistro(new Sms($provedor), $registro),
            3,
            function (int $ms) use (&$esperas) {
                $esperas[] = $ms;
            },
        );
        $canal->enviar($this->morador(), new Mensagem('Teste', 'olá'));
        $this->assertSame(
            [
                'sms para Diego: falhou (provedor indisponível)',
                'sms para Diego: falhou (provedor indisponível)',
                'sms para Diego: entregue (Teste)',
            ],
            $registro,
        );
        $this->assertSame([100, 200], $esperas); // espera crescente
    }

    public function testDecoratorFalhaDefinitivaNaoERepetida(): void
    {
        $provedor = new ProvedorSimulado([], ['d@x.com']);
        $registro = [];
        $canal = new ComRetentativas(
            new ComRegistro(new Email($provedor), $registro),
            3,
            fn() => null,
        );
        try {
            $canal->enviar($this->morador(), new Mensagem('Teste', 'olá'));
            $this->fail('deveria ter falhado');
        } catch (\RuntimeException $erro) {
            $this->assertStringContainsString(
                'sem nova tentativa',
                $erro->getMessage(),
            );
        }
        $this->assertCount(1, $registro);
    }

    public function testStateAReservaAceitaSoAsTransicoesDoEstado(): void
    {
        $reserva = new Reserva($this->pedido(false, '2026-03-03'));
        $reserva->aprovar();
        $reserva->cancelar();
        $this->assertSame('cancelada', $reserva->estado());
        $this->expectExceptionMessage('não é possível aprovar uma reserva cancelada');
        $reserva->aprovar();
    }

    public function testRepositorySalvarSeLivreRecusaOSegundoPedido(): void
    {
        $reservas = new RepositorioEmMemoria();
        $primeira = new Reserva($this->pedido(false, '2026-03-03'));
        $this->assertTrue($reservas->salvarSeLivre($primeira));
        $primeira->aprovar();
        $segunda = new Reserva($this->pedido(false, '2026-03-03'));
        $this->assertFalse($reservas->salvarSeLivre($segunda));
    }

    public function testFactoryEscolhePeloCanalEUsaEmailSeNaoConhecer(): void
    {
        $registro = [];
        $fabrica = new FabricaDeCanais(
            new ProvedorSimulado([]),
            $registro,
            fn() => null,
        );
        $this->assertSame('sms', $fabrica->para($this->morador())->nome());
        $this->assertSame(
            'email',
            $fabrica->para($this->morador('pombo-correio'))->nome(),
        );
    }

    public function testChainAPrimeiraEtapaQueRecusaDecideOMotivo(): void
    {
        $cadeia = new UnidadeEmDia();
        $cadeia->depois(new AntecedenciaMinima(new DateTimeImmutable('2026-03-02')));
        $this->assertSame(
            'unidade com débito em aberto',
            $cadeia->avaliar($this->pedido(emDebito: true))->motivo,
        );
        $this->assertSame(
            'antecedência mínima de 2 dias',
            $cadeia->avaliar($this->pedido())->motivo,
        );
        $this->assertEquals(
            new Decisao(true),
            $cadeia->avaliar($this->pedido(data: '2026-03-10')),
        );
    }

    public function testObserverUmAssinanteQueFalhaNaoImpedeOsOutros(): void
    {
        $eventos = new Barramento();
        $recebidos = new ArrayObject();
        $eventos->assinar(
            'ReservaConfirmada',
            new class implements Assinante {
                public function nome(): string
                {
                    return 'Quebrado';
                }

                public function tratar(Evento $evento): void
                {
                    throw new RuntimeException('fora do ar');
                }
            },
        );
        $eventos->assinar(
            'ReservaConfirmada',
            new class ($recebidos) implements Assinante {
                public function __construct(private ArrayObject $recebidos) {}

                public function nome(): string
                {
                    return 'Portaria';
                }

                public function tratar(Evento $evento): void
                {
                    $this->recebidos[] = $evento->pedido->id;
                }
            },
        );
        $eventos->publicar(new Evento('ReservaConfirmada', $this->pedido()));
        $this->assertSame(['R-1'], $recebidos->getArrayCopy());
        $this->assertSame(
            ['ReservaConfirmada R-1: Quebrado: fora do ar'],
            $eventos->falhas,
        );
    }
}
