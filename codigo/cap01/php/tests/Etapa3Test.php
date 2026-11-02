<?php
// Testes de unidade da etapa 3: possíveis porque o cálculo foi separado do resto.
require_once __DIR__ . '/../src/etapa3/aplicacao.php';

use Morada\Etapa3\Aviso;
use Morada\Etapa3\Boleto;
use Morada\Etapa3\Calculo;
use Morada\Etapa3\Notificador;
use PHPUnit\Framework\TestCase;
use function Morada\Etapa3\gerarCobrancaMensal;

final class Etapa3Test extends TestCase
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

    public function testDivideAsDespesasPelaFracaoESomaFundoDeReserva(): void
    {
        $c = Calculo::calcularCobranca(485000, $this->unidade(), $this->hoje());
        $this->assertSame(60625, $c->taxa);
        $this->assertSame(6063, $c->fundo);
        $this->assertSame(66688, $c->total);
    }

    public function testCobraMultaEJurosProporcionaisAosDiasDeAtraso(): void
    {
        $unidade = $this->unidade([
            'debitoAnterior' => [
                'valorCentavos' => 66750,
                'vencimento' => '2026-02-10',
            ],
        ]);
        $c = Calculo::calcularCobranca(485000, $unidade, $this->hoje());
        $this->assertSame(1335, $c->multa);
        $this->assertSame(445, $c->juros); // 20 dias
        $this->assertSame(66688 + 66750 + 1335 + 445, $c->total);
    }

    public function testAvisaCadaMoradorUmaVezSemEnviarNada(): void
    {
        $notificador = new class implements Notificador {
            public array $avisos = [];

            public function notificar(Aviso $aviso): void
            {
                $this->avisos[] = $aviso;
            }
        };
        $dados = [
            'condominio' => [
                'id' => 'teste',
                'nome' => 'Condomínio Teste',
                'despesasDoMesCentavos' => 100000,
            ],
            'unidades' => [
                $this->unidade(['fracaoMilionesimos' => 500000]),
                $this->unidade(['id' => 'A-102', 'fracaoMilionesimos' => 500000]),
            ],
        ];
        gerarCobrancaMensal($dados, $this->hoje(), new Boleto(), $notificador);
        $this->assertSame(
            ['A-101', 'A-102'],
            array_map(fn($a) => $a->cobranca->unidade['id'], $notificador->avisos),
        );
        $this->assertSame(
            'BOL-teste-202603-A-101-55000',
            $notificador->avisos[0]->codigoDePagamento,
        );
    }
}
