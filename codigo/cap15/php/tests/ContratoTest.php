<?php
// Testes do contrato. O primeiro é o que quebra o build quando alguém muda
// openapi/v1.yaml de um jeito que os clientes atuais não aguentam.
require_once __DIR__ . '/../src/contrato/compatibilidade.php';
require_once __DIR__ . '/../src/contrato/validar.php';

use PHPUnit\Framework\TestCase;

use function Morada\Contrato\{compararContratos, lerContrato, validarResposta};

final class ContratoTest extends TestCase
{
    private static function quebras(array $antigo, array $novo): array
    {
        $incompativeis = array_filter(
            compararContratos($antigo, $novo),
            fn($m) => !$m->compativel,
        );
        return array_values(array_map(fn($m) => $m->texto, $incompativeis));
    }

    public function testOContratoAtualECompativelComOPublicado(): void
    {
        $publicado = lerContrato('/dados/openapi/publicado/v1.yaml');
        $atual = lerContrato('/dados/openapi/v1.yaml');
        $this->assertSame([], self::quebras($publicado, $atual));
    }

    public function testRenomearUmCampoDaRespostaEIncompativel(): void
    {
        $publicado = lerContrato('/dados/openapi/publicado/v1.yaml');
        $proposta = lerContrato('/dados/entrada/propostas/b-renomear.yaml');
        $this->assertSame(
            [
                'GET /v1/condominios/{condominio}/cobrancas 200: ' .
                'campo removido: dados[].valorCentavos',
            ],
            self::quebras($publicado, $proposta),
        );
    }

    public function testUmaRespostaComOTipoErradoNaoPassaNaConferencia(): void
    {
        $corpo = json_decode(
            json_encode([
                'dados' => [
                    [
                        'id' => 'CB-02',
                        'unidade' => '102',
                        'vencimento' => '2026-10-10',
                        'valorCentavos' => '450,00',
                        'situacao' => 'aberta',
                    ],
                ],
                'proximo' => null,
            ]),
        );
        $atual = lerContrato('/dados/openapi/v1.yaml');
        $caminho = '/v1/condominios/C-01/cobrancas';
        $this->assertSame(
            [
                'GET /v1/condominios/{condominio}/cobrancas 200: ' .
                '$.dados[0].valorCentavos: esperado integer, recebido string',
            ],
            validarResposta($atual, 'GET', $caminho, 200, 'application/json', $corpo),
        );
    }
}
