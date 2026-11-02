<?php
// Adaptador: traduz a cobrança do Morada para a API do PagaFácil (Pix).
namespace Morada\Depois\Provedores;

require_once __DIR__ . '/../emissao/gateway.php';
require_once __DIR__ . '/../../externos/paga-facil.php';

use Morada\Depois\Cobranca\Cobranca;
use Morada\Depois\Emissao\{GatewayDePagamento, Prazos, Registro};
use Morada\Externos\PagaFacilApi;

final class GatewayPagaFacil implements GatewayDePagamento
{
    public function __construct(private readonly PagaFacilApi $api) {}

    public function nome(): string
    {
        return 'PagaFácil';
    }

    public function registrar(Cobranca $cobranca, Prazos $prazos): Registro
    {
        // txid único por mês e unidade: MORADA202603A101
        $mes = str_replace('-', '', substr($prazos->vencimento, 0, 7));
        $pedido = [
            'txid' => 'MORADA' . $mes . str_replace('-', '', $cobranca->unidade),
            'valorCentavos' => $cobranca->total(),
            'expiraEm' => $prazos->vencimento,
        ];
        if ($cobranca->desconto() > 0) {
            $pedido['descontoCentavos'] = $cobranca->desconto();
            $pedido['descontoAte'] = $prazos->descontoAte;
        }
        $resposta = $this->api->criarCobranca($pedido);
        return new Registro($cobranca->unidade, "pix {$resposta['txid']}");
    }
}
