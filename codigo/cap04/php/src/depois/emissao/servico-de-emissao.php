<?php
// Controlador (GRASP): coordena o cálculo e o registro sem fazer nenhum dos dois.
// Depende de abstrações recebidas pelo construtor (injeção de dependência).
namespace Morada\Depois\Emissao;

require_once __DIR__ . '/gateway.php';
require_once __DIR__ . '/../cobranca/calculadora.php';

use Morada\Depois\Cobranca\CalculadoraDeCobranca;

final class ServicoDeEmissao
{
    public function __construct(
        private readonly CalculadoraDeCobranca $calculadora,
        private readonly GatewayDePagamento $gateway,
        private readonly Prazos $prazos,
    ) {}

    public function emitir(array $unidades): array
    {
        $cobrancas = array_map(fn($u) => $this->calculadora->calcular($u), $unidades);
        $registros = array_map(
            fn($c) => $this->gateway->registrar($c, $this->prazos),
            $cobrancas,
        );
        return [$cobrancas, $registros];
    }
}
