<?php
// Os testes da classe-broto: a regra nova é testada sozinha, sem o código legado.
require_once __DIR__ . '/../src/etapa6/limite.php';

use Morada\Etapa6\LimitePorMes;
use PHPUnit\Framework\TestCase;

final class LimiteTest extends TestCase
{
    private function salao(string $unidade, string $data): array
    {
        return ['unidade' => $unidade, 'espaco' => 'salao', 'data' => $data];
    }

    private function churrasco(string $data): array
    {
        return ['unidade' => 'A-101', 'espaco' => 'churrasqueira', 'data' => $data];
    }

    public function testRecusaASegundaReservaDoSalaoNoMesmoMes(): void
    {
        $feitas = [$this->salao('A-101', '2026-03-14')];
        $pedido = $this->salao('A-101', '2026-03-28');
        $this->assertTrue((new LimitePorMes())->atingido($pedido, $feitas));
    }

    public function testNaoContaOutroMesOutraUnidadeNemOutroEspaco(): void
    {
        $feitas = [
            $this->salao('A-101', '2026-02-28'),
            $this->salao('B-101', '2026-03-14'),
            $this->churrasco('2026-03-07'),
        ];
        $pedido = $this->salao('A-101', '2026-03-28');
        $this->assertFalse((new LimitePorMes())->atingido($pedido, $feitas));
    }

    public function testChurrasqueiraAceitaDuasEEspacoSemLimiteAceitaTodas(): void
    {
        $limite = new LimitePorMes();
        $duas = [$this->churrasco('2026-03-07'), $this->churrasco('2026-03-14')];
        $pedido = $this->churrasco('2026-03-21');
        $this->assertFalse($limite->atingido($pedido, [$duas[0]]));
        $this->assertTrue($limite->atingido($pedido, $duas));
        $piscina = [
            'unidade' => 'A-101',
            'espaco' => 'piscina',
            'data' => '2026-03-21',
        ];
        $this->assertFalse($limite->atingido($piscina, [$piscina, $piscina]));
    }
}
