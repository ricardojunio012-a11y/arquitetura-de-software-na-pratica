<?php
// Testes de unidade das três mudanças, feitas sobre o código refatorado.
require_once __DIR__ . '/../src/etapa4/aplicacao.php';

use Morada\Etapa4\Aviso;
use Morada\Etapa4\Boleto;
use Morada\Etapa4\Calculo;
use Morada\Etapa4\Notificador;
use Morada\Etapa4\Pix;
use PHPUnit\Framework\TestCase;
use function Morada\Etapa4\gerarCobrancaMensal;

final class Etapa4Test extends TestCase
{
    private function hoje(): DateTimeImmutable
    {
        return new DateTimeImmutable('2026-03-02', new DateTimeZone('UTC'));
    }

    private function unidade(array $extra = []): array
    {
        return array_merge(
            [
                'id' => 'A-101',
                'fracaoMilionesimos' => 125000,
                'morador' => [
                    'nome' => 'Ana',
                    'email' => 'ana@example.com',
                    'canal' => 'email',
                ],
                'meioPagamento' => 'boleto',
                'debitoAnterior' => null,
            ],
            $extra,
        );
    }

    public function testDaDescontoDePontualidadeParaQuemNaoTemDebito(): void
    {
        $c = Calculo::calcularCobranca(485000, $this->unidade(), $this->hoje());
        $this->assertSame(66688 - 3031, $c->totalAte05);
    }

    public function testNaoDaDescontoParaQuemTemDebito(): void
    {
        $unidade = $this->unidade([
            'debitoAnterior' => ['valorCentavos' => 1000, 'vencimento' => '2026-02-10'],
        ]);
        $this->assertNull(
            Calculo::calcularCobranca(485000, $unidade, $this->hoje())->totalAte05,
        );
    }

    public function testUsaPixEWhatsAppQuandoAUnidadePede(): void
    {
        $fake = fn() => new class implements Notificador {
            public array $codigos = [];

            public function notificar(Aviso $aviso): void
            {
                $this->codigos[] = $aviso->codigoDePagamento;
            }
        };
        $email = $fake();
        $whatsapp = $fake();
        $dados = [
            'condominio' => [
                'id' => 'teste',
                'nome' => 'Condomínio Teste',
                'despesasDoMesCentavos' => 100000,
            ],
            'unidades' => [
                $this->unidade(['fracaoMilionesimos' => 500000]),
                $this->unidade([
                    'id' => 'A-102',
                    'fracaoMilionesimos' => 500000,
                    'meioPagamento' => 'pix',
                    'morador' => [
                        'nome' => 'Bia',
                        'email' => 'bia@example.com',
                        'telefone' => '+5511900000000',
                        'canal' => 'whatsapp',
                    ],
                ]),
            ],
        ];
        gerarCobrancaMensal(
            $dados,
            $this->hoje(),
            ['boleto' => new Boleto(), 'pix' => new Pix()],
            ['email' => $email, 'whatsapp' => $whatsapp],
        );
        $this->assertSame(['BOL-teste-202603-A-101-55000'], $email->codigos);
        $this->assertSame(['PIX-teste-202603-A-102-55000'], $whatsapp->codigos);
    }
}
