<?php
// Uso: php main.php <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Raiz de composição: o único lugar que conhece as classes concretas e as monta.
foreach (glob(__DIR__ . '/cobranca/regras/*.php') as $regra) {
    require_once $regra;
}
require_once __DIR__ . '/emissao/servico-de-emissao.php';
require_once __DIR__ . '/provedores/gateway-banco-alfa.php';
require_once __DIR__ . '/provedores/gateway-paga-facil.php';
require_once __DIR__ . '/relatorios.php';

use Morada\Depois\Cobranca\CalculadoraDeCobranca;
use Morada\Depois\Cobranca\Regras\{DebitoAnterior, DescontoAntecipado, FundoDeReserva};
use Morada\Depois\Cobranca\Regras\{IsencaoDoSindico, JurosPorAtraso, MultaPorAtraso};
use Morada\Depois\Cobranca\Regras\TaxaCondominial;
use Morada\Depois\Emissao\{Prazos, ServicoDeEmissao};
use Morada\Depois\Provedores\{GatewayBancoAlfa, GatewayPagaFacil};
use Morada\Externos\{ClienteBancoAlfa, PagaFacilApi};
use function Morada\Compartilhado\{dataDoMes, rotuloDoMes};
use function Morada\Depois\Relatorios\{relatorioDeCobrancas, relatorioDeRegistros};

[, $entrada, $saida, $opcao, $data] = $argv + array_fill(0, 5, null);
$hoje = new DateTimeImmutable(
    $opcao === '--hoje' ? $data : 'today',
    new DateTimeZone('UTC'),
);
$dados = json_decode(file_get_contents($entrada), true);
$p = $dados['politica'];
$prazos = new Prazos(
    vencimento: dataDoMes($hoje, $p['vencimentoDia']),
    descontoAte: dataDoMes($hoje, $p['descontoAteDia']),
);

// A ordem importa: cada regra vê o que as anteriores lançaram
$regras = [
    new TaxaCondominial($dados['condominio']['despesasDoMesCentavos']),
    new FundoDeReserva($p['fundoDeReservaPorcento']),
    new IsencaoDoSindico(),
    new DebitoAnterior(),
    new MultaPorAtraso($p['multaPorcento']),
    new JurosPorAtraso($p['jurosAoMesPorcento'], $hoje),
    // Por último: o desconto depende da isenção e do débito já lançados
    new DescontoAntecipado($p['descontoAntecipadoPorcento'], $prazos->descontoAte),
];
$gateways = [
    'alfa' => fn() => new GatewayBancoAlfa(new ClienteBancoAlfa()),
    'pagafacil' => fn() => new GatewayPagaFacil(new PagaFacilApi()),
];
$gateway = $gateways[getenv('GATEWAY') ?: 'alfa']();
$servico = new ServicoDeEmissao(new CalculadoraDeCobranca($regras), $gateway, $prazos);

[$cobrancas, $registros] = $servico->emitir($dados['unidades']);
$titulo = rotuloDoMes($hoje) . ' - ' . $dados['condominio']['nome'];
@mkdir($saida, 0777, true);
file_put_contents(
    "$saida/cobrancas.txt",
    relatorioDeCobrancas($titulo, $cobrancas, $prazos),
);
file_put_contents(
    "$saida/registros.txt",
    relatorioDeRegistros($titulo, $gateway->nome(), $cobrancas, $registros),
);
echo "cobranças emitidas em $saida ({$gateway->nome()})\n";
