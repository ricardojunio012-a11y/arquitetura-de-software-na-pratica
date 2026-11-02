<?php
// Orquestra a geração mensal: calcula, gera o pagamento, registra e avisa.
namespace Morada\Etapa3;

require_once __DIR__ . '/Dinheiro.php';
require_once __DIR__ . '/Competencia.php';
require_once __DIR__ . '/Calculo.php';
require_once __DIR__ . '/Pagamento.php';
require_once __DIR__ . '/Notificacao.php';
require_once __DIR__ . '/RelatorioDeCobrancas.php';

function gerarCobrancaMensal(
    array $dados,
    \DateTimeImmutable $hoje,
    MeioDePagamento $pagamento,
    Notificador $notificador,
): RelatorioDeCobrancas {
    $condominio = $dados['condominio'];
    $competencia = Competencia::de($hoje);
    $relatorio = new RelatorioDeCobrancas($condominio['nome'], $competencia);
    foreach ($dados['unidades'] as $unidade) {
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
