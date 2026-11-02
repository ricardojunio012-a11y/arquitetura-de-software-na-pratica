<?php
// Cenários de qualidade executáveis: geram carga sintética, medem o que é nosso,
// estimam o que depende de terceiros e comparam o total com a meta.
namespace Morada;

require_once __DIR__ . '/cobranca/Dinheiro.php';
require_once __DIR__ . '/cobranca/Competencia.php';
require_once __DIR__ . '/cobranca/Calculo.php';
require_once __DIR__ . '/cobranca/Pagamento.php';
require_once __DIR__ . '/cobranca/Notificacao.php';

use Morada\Cobranca\Aviso;
use Morada\Cobranca\Boleto;
use Morada\Cobranca\Calculo;
use Morada\Cobranca\Competencia;
use Morada\Cobranca\EmailEmArquivo;

final class Resultado
{
    public function __construct(
        public readonly array $cenario,
        public readonly int $cobrancas,
        public readonly float $segundosCalculo, // medido
        public readonly float $segundosRegistro, // estimado
        public readonly int $bytesAvisos,
        public readonly bool $passou,
    ) {}
}

// Condomínio sintético e determinístico: a mesma carga em qualquer linguagem
function condominioSintetico(int $i, int $unidades): array
{
    $lista = [];
    for ($k = 1; $k <= $unidades; $k++) {
        $lista[] = [
            'id' => "U-$k",
            'fracaoMilionesimos' => intdiv(1000000, $unidades),
            'morador' => [
                'nome' => "Morador $k",
                'email' => "morador$k@exemplo.com",
                'canal' => 'email',
            ],
            'meioPagamento' => 'boleto',
            'debitoAnterior' =>
                $k % 7 === 0
                    ? ['valorCentavos' => 50000, 'vencimento' => '2026-02-10']
                    : null,
        ];
    }
    $despesas = 3000000 + ($i % 50) * 10000;
    return [
        'condominio' => [
            'id' => "cond-$i",
            'nome' => "Condomínio $i",
            'despesasDoMesCentavos' => $despesas,
        ],
        'unidades' => $lista,
    ];
}

// A medida de resposta do cenário: terminar dentro do limite
function avaliar(float $segundos, float $limiteSegundos): bool
{
    return $segundos <= $limiteSegundos;
}

function executar(array $cenario, \DateTimeImmutable $hoje): Resultado
{
    $boleto = new Boleto();
    $competencia = Competencia::de($hoje);
    $cobrancas = 0;
    $bytesAvisos = 0;
    $inicio = hrtime(true);
    for ($i = 1; $i <= $cenario['condominios']; $i++) {
        $dados = condominioSintetico($i, $cenario['unidadesPorCondominio']);
        $condominio = $dados['condominio'];
        foreach ($dados['unidades'] as $unidade) {
            $cobranca = Calculo::calcularCobranca(
                $condominio['despesasDoMesCentavos'],
                $unidade,
                $hoje,
            );
            $codigo = $boleto->gerarCodigo($condominio['id'], $competencia, $cobranca);
            $aviso = new Aviso(
                $condominio['nome'],
                $competencia,
                $cobranca,
                $boleto->nome(),
                $codigo,
            );
            $bytesAvisos += strlen(EmailEmArquivo::formatar($aviso));
            $cobrancas++;
        }
    }
    $segundosCalculo = (hrtime(true) - $inicio) / 1e9;
    // O registro dos boletos depende do banco emissor: estimamos pela capacidade dele
    $segundosRegistro = $cobrancas / $cenario['registrosPorSegundo'];
    $total = $segundosCalculo + $segundosRegistro;
    return new Resultado(
        $cenario,
        $cobrancas,
        $segundosCalculo,
        $segundosRegistro,
        $bytesAvisos,
        avaliar($total, $cenario['limiteSegundos']),
    );
}
