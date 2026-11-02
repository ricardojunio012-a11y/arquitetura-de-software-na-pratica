<?php
// Testes de caracterização: descrevem o que o código faz hoje, inclusive o que
// talvez esteja errado. Mudar o comportamento é outro passo, com outro commit.
require_once __DIR__ . '/../src/etapa5/reservas.php';

use PHPUnit\Framework\TestCase;
use function Morada\Etapa5\{avisos, decidir, motivoDaRecusa, relatorio, valorDaReserva};

final class ReservasTest extends TestCase
{
    // Entrada e resultado aprovado: /dados no contêiner; fora dele, o capítulo
    private function ler(string $pasta, string $arquivo): string
    {
        $base = is_dir("/dados/$pasta") ? "/dados/$pasta" : __DIR__ . "/../../$pasta";
        return file_get_contents("$base/$arquivo");
    }

    private function hoje(): DateTimeImmutable
    {
        return new DateTimeImmutable('2026-03-02', new DateTimeZone('UTC'));
    }

    public function testASaidaEIdenticaAoResultadoAprovado(): void
    {
        $dados = json_decode($this->ler('entrada', 'reservas.json'), true);
        $decisoes = decidir($dados, $this->hoje());
        $emails = array_map(fn($a) => "para {$a[0]}: {$a[1]}", avisos($decisoes));
        $this->assertSame(
            $this->ler('esperado', 'reservas.txt'),
            implode("\n", relatorio($decisoes)) . "\n",
        );
        $this->assertSame(
            $this->ler('esperado', 'emails.txt'),
            implode("\n", $emails) . "\n",
        );
    }

    public function testDomingoNaoTemAcrescimoDeFimDeSemanaComportamentoAtual(): void
    {
        $salao = ['id' => 'salao', 'nome' => 'Salão', 'taxa' => 15000];
        $domingo = [
            'id' => 'R',
            'espaco' => 'salao',
            'data' => '2026-03-15',
            'convidados' => 1,
        ];
        $this->assertSame(15000, valorDaReserva($salao, $domingo));
        $this->assertSame(
            18000,
            valorDaReserva($salao, ['data' => '2026-03-14'] + $domingo),
        );
    }

    public function testAPrimeiraRegraQueFalhaDecideOMotivo(): void
    {
        $pedido = ['id' => 'R', 'espaco' => 'salao', 'data' => '2026-03-03'];
        $emDebito = ['id' => 'A', 'email' => 'a@x.com', 'emDebito' => true];
        $this->assertSame(
            'débito',
            motivoDaRecusa($pedido, $emDebito, $this->hoje(), []),
        );
        $emDia = ['emDebito' => false] + $emDebito;
        $this->assertSame(
            'antecedência',
            motivoDaRecusa($pedido, $emDia, $this->hoje(), []),
        );
    }
}
