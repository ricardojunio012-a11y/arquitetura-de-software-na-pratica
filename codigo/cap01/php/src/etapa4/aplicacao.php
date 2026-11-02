<?php
// Orquestra a geração mensal: calcula, gera o pagamento, registra e avisa.
namespace Morada\Etapa4;

require_once __DIR__ . '/Dinheiro.php';
require_once __DIR__ . '/Competencia.php';
require_once __DIR__ . '/Calculo.php';
require_once __DIR__ . '/Pagamento.php';
require_once __DIR__ . '/Notificacao.php';
require_once __DIR__ . '/RelatorioDeCobrancas.php';
require_once __DIR__ . '/Pix.php';
require_once __DIR__ . '/WhatsApp.php';

/**
 * @param array<string, MeioDePagamento> $meiosDePagamento
 * @param array<string, Notificador> $notificadores
 */
function gerarCobrancaMensal(
    array $dados,
    \DateTimeImmutable $hoje,
    array $meiosDePagamento,
    array $notificadores,
): RelatorioDeCobrancas {
    $condominio = $dados['condominio'];
    $competencia = Competencia::de($hoje);
    $relatorio = new RelatorioDeCobrancas($condominio['nome'], $competencia);
    foreach ($dados['unidades'] as $unidade) {
        $pagamento = $meiosDePagamento[$unidade['meioPagamento']];
        $notificador = $notificadores[$unidade['morador']['canal']];
        $cobranca = Calculo::calcularCobranca(
            $condominio['despesasDoMesCentavos'],
            $unidade,
            $hoje,
        );
        $codigo = $pagamento->gerarCodigo($condominio['id'], $competencia, $cobranca);
        $relatorio->adicionar($cobranca, $codigo);
        $notificador->notificar(
            new Aviso(
                $condominio['nome'],
                $competencia,
                $cobranca,
                $pagamento->nome(),
                $codigo,
            ),
        );
    }
    return $relatorio;
}
