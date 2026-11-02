<?php
// Testes: o que a versão antes não deixa testar e o que a versão depois isola.
require_once __DIR__ . '/../src/antes/emissao.php';
foreach (glob(__DIR__ . '/../src/depois/cobranca/regras/*.php') as $regra) {
    require_once $regra;
}
require_once __DIR__ . '/../src/depois/emissao/servico-de-emissao.php';

use Morada\Depois\Cobranca\{CalculadoraDeCobranca, Cobranca, Lancamento, Regra};
use Morada\Depois\Cobranca\Regras\{
    DebitoAnterior,
    DescontoAntecipado,
    FundoDeReserva,
    IsencaoDoSindico,
    TaxaCondominial,
};
use Morada\Depois\Emissao\{GatewayDePagamento, Prazos, Registro, ServicoDeEmissao};
use Morada\Externos\ClienteBancoAlfa;
use PHPUnit\Framework\TestCase;
use function Morada\Antes\emitirCobrancas;

// Dublê de teste: implementa a interface e só anota o que recebeu
final class GatewayEmMemoria implements GatewayDePagamento
{
    public array $recebidas = [];

    public function nome(): string
    {
        return 'em memória';
    }

    public function registrar(Cobranca $cobranca, Prazos $prazos): Registro
    {
        $this->recebidas[] = $cobranca;
        return new Registro($cobranca->unidade, 'teste');
    }
}

final class EmissaoTest extends TestCase
{
    private function dados(): array
    {
        // Entrada: /dados/entrada no contêiner; fora dele, a pasta do capítulo
        $arquivo = is_file('/dados/entrada/condominio.json')
            ? '/dados/entrada/condominio.json'
            : __DIR__ . '/../../entrada/condominio.json';
        return json_decode(file_get_contents($arquivo), true);
    }

    public function testAntesCalcularAsCobrancasTambemEmiteBoletosNoBanco(): void
    {
        $antes = ClienteBancoAlfa::$emitidos;
        emitirCobrancas($this->dados(), new DateTimeImmutable('2026-03-02'));
        $this->assertSame(8, ClienteBancoAlfa::$emitidos - $antes);
    }

    public function testDepoisUmaRegraNovaEntraSemMudarACalculadora(): void
    {
        $d = $this->dados();
        $taxaExtra = new class implements Regra {
            public function aplicar(array $unidade, array $lancados): array
            {
                return [new Lancamento('obra', 'Chamada para obra', 5000)];
            }
        };
        $calculadora = new CalculadoraDeCobranca([
            new TaxaCondominial($d['condominio']['despesasDoMesCentavos']),
            $taxaExtra,
        ]);
        $this->assertSame(
            60625 + 5000,
            $calculadora->calcular($d['unidades'][0])->total(),
        );
    }

    public function testDepoisSindicoFicaIsentoDaTaxaEPagaOFundo(): void
    {
        $d = $this->dados();
        $calculadora = new CalculadoraDeCobranca([
            new TaxaCondominial($d['condominio']['despesasDoMesCentavos']),
            new FundoDeReserva(10),
            new IsencaoDoSindico(),
        ]);
        $sindico = array_values(
            array_filter($d['unidades'], fn($u) => !empty($u['sindico'])),
        )[0];
        $this->assertSame(6790, $calculadora->calcular($sindico)->total());
    }

    public function testDepoisQuemTemDebitoNaoGanhaODescontoPorPontualidade(): void
    {
        $d = $this->dados();
        $calculadora = new CalculadoraDeCobranca([
            new TaxaCondominial($d['condominio']['despesasDoMesCentavos']),
            new DebitoAnterior(),
            new DescontoAntecipado(5, '2026-03-05'),
        ]);
        $porId = array_column($d['unidades'], null, 'id');
        $this->assertSame(3031, $calculadora->calcular($porId['A-101'])->desconto());
        $this->assertSame(0, $calculadora->calcular($porId['A-201'])->desconto());
    }

    public function testDepoisEmissaoFuncionaComQualquerGatewaySemBancoDeVerdade(): void
    {
        $d = $this->dados();
        $gateway = new GatewayEmMemoria();
        $calculadora = new CalculadoraDeCobranca([
            new TaxaCondominial($d['condominio']['despesasDoMesCentavos']),
        ]);
        $antes = ClienteBancoAlfa::$emitidos;
        $prazos = new Prazos('2026-03-10', '2026-03-05');
        (new ServicoDeEmissao($calculadora, $gateway, $prazos))->emitir($d['unidades']);
        $this->assertCount(8, $gateway->recebidas);
        $this->assertSame($antes, ClienteBancoAlfa::$emitidos);
    }
}
