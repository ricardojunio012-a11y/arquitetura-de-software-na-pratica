<?php
// Adaptador: traduz a cobrança do Morada para a API do Banco Alfa (boleto).
namespace Morada\Depois\Provedores;

require_once __DIR__ . '/../emissao/gateway.php';
require_once __DIR__ . '/../../compartilhado/datas.php';
require_once __DIR__ . '/../../compartilhado/dinheiro.php';
require_once __DIR__ . '/../../externos/banco-alfa.php';

use Morada\Depois\Cobranca\Cobranca;
use Morada\Depois\Emissao\{GatewayDePagamento, Prazos, Registro};
use Morada\Externos\ClienteBancoAlfa;
use function Morada\Compartilhado\{dataBr, reaisComPonto};

final class GatewayBancoAlfa implements GatewayDePagamento
{
    public function __construct(private readonly ClienteBancoAlfa $cliente) {}

    public function nome(): string
    {
        return 'Banco Alfa';
    }

    public function registrar(Cobranca $cobranca, Prazos $prazos): Registro
    {
        $pedido = [
            'pagador' => $cobranca->morador,
            'valor' => reaisComPonto($cobranca->total()),
            'vencimento' => dataBr($prazos->vencimento),
        ];
        if ($cobranca->desconto() > 0) {
            $pedido['desconto'] = [
                'valor' => reaisComPonto($cobranca->desconto()),
                'ate' => dataBr($prazos->descontoAte),
            ];
        }
        $resposta = $this->cliente->emitirBoleto($pedido);
        return new Registro($cobranca->unidade, "boleto {$resposta['nossoNumero']}");
    }
}
