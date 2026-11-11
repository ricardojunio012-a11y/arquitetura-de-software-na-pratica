<?php
// Testes de integração da idempotência contra o PostgreSQL: cinco pedidos
// simultâneos com a mesma chave resultam num único pagamento, e todos recebem a mesma
// resposta; a mesma chave em duas administradoras são dois pedidos diferentes. A API
// precisa estar no ar em API_URL (o rodar.sh a sobe com vários processos).
require_once __DIR__ . '/../src/api/api.php';

use PHPUnit\Framework\TestCase;

use function Morada\Api\{conectar, prepararBanco};

final class IdempotenciaTest extends TestCase
{
    protected function setUp(): void
    {
        if (!getenv('BANCO_URL') || !getenv('API_URL')) {
            $this->markTestSkipped('sem banco ou sem API');
        }
        prepararBanco(getenv('BANCO_URL'), '/dados/entrada/cobrancas.json');
    }

    private function pedido(string $administradora, string $cobranca, int $valor)
    {
        $curl = curl_init(getenv('API_URL') . '/v1/pagamentos');
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                "Morada-Administradora: $administradora",
                'Idempotency-Key: k-1',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'cobranca' => $cobranca,
                'valorCentavos' => $valor,
            ]),
            CURLOPT_RETURNTRANSFER => true,
        ]);
        return $curl;
    }

    private function totalDePagamentos(): int
    {
        return conectar(getenv('BANCO_URL'))
            ->query('SELECT count(*) FROM pagamentos')
            ->fetchColumn();
    }

    public function testPedidosSimultaneosComAMesmaChavePagamUmaVezSo(): void
    {
        $todos = curl_multi_init();
        $pedidos = [];
        for ($i = 0; $i < 5; $i++) {
            $curl = $this->pedido('ADM-A', 'CB-04', 45000);
            curl_multi_add_handle($todos, $curl);
            $pedidos[] = $curl;
        }
        do {
            curl_multi_exec($todos, $ativos);
            curl_multi_select($todos);
        } while ($ativos > 0);
        $status = array_map(
            fn($c) => curl_getinfo($c, CURLINFO_RESPONSE_CODE),
            $pedidos,
        );
        $ids = array_map(
            fn($c) => json_decode(curl_multi_getcontent($c), true)['id'],
            $pedidos,
        );
        $this->assertSame([201, 201, 201, 201, 201], $status);
        $this->assertCount(1, array_unique($ids));
        $this->assertSame(1, $this->totalDePagamentos());
    }

    public function testAMesmaChaveEmDuasAdministradorasNaoColide(): void
    {
        $a = $this->pedido('ADM-A', 'CB-04', 45000);
        $corpoA = json_decode(curl_exec($a), true);
        $b = $this->pedido('ADM-B', 'CB-05', 38000);
        $corpoB = json_decode(curl_exec($b), true);
        $status = [
            curl_getinfo($a, CURLINFO_RESPONSE_CODE),
            curl_getinfo($b, CURLINFO_RESPONSE_CODE),
        ];
        $this->assertSame([201, 201], $status);
        $this->assertSame('CB-04', $corpoA['cobranca']);
        $this->assertSame('CB-05', $corpoB['cobranca']);
        $this->assertSame(2, $this->totalDePagamentos());
    }
}
