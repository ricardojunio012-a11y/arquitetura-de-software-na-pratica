<?php
// Interface pública da cobrança: os outros módulos só usam o que está aqui.
namespace Morada\Depois\Cobranca;

require_once __DIR__ . '/../compartilhado/datas.php';
require_once __DIR__ . '/../compartilhado/dinheiro.php';
require_once __DIR__ . '/regras.php';

use function Morada\Depois\Compartilhado\parteDe;
use function Morada\Depois\Compartilhado\reais;
use function Morada\Depois\Compartilhado\rotuloDoMes;

final class Cobranca
{
    public function __construct(
        public readonly string $unidade,
        public readonly string $morador,
        public readonly int $taxa,
        public readonly int $fundo,
        public readonly int $debito,
        public readonly int $diasDeAtraso,
        public readonly int $multa,
        public readonly int $juros,
        public readonly int $total,
    ) {}
}

/** @return Cobranca[] */
function calcularCobrancas(
    int $despesas,
    array $unidades,
    \DateTimeImmutable $hoje,
): array {
    return array_map(function (array $u) use ($despesas, $hoje) {
        $taxa = parteDe($despesas, $u['fracaoMilionesimos']);
        $fundo = fundoDeReserva($taxa);
        $debito = $u['debitoAnterior']['valorCentavos'] ?? 0;
        $e = $u['debitoAnterior']
            ? encargos($debito, $u['debitoAnterior']['vencimento'], $hoje)
            : ['dias' => 0, 'multa' => 0, 'juros' => 0];
        $total = $taxa + $fundo + $debito + $e['multa'] + $e['juros'];
        return new Cobranca(
            $u['id'],
            $u['morador']['nome'],
            $taxa,
            $fundo,
            $debito,
            $e['dias'],
            $e['multa'],
            $e['juros'],
            $total,
        );
    }, $unidades);
}

/** @param Cobranca[] $cobrancas */
function relatorioDeCobrancas(
    string $condominio,
    \DateTimeImmutable $hoje,
    array $cobrancas,
): string {
    $linhas = ['# Cobranças ' . rotuloDoMes($hoje) . " - $condominio"];
    $linhas[] = 'unidade;morador;taxa;fundo;debito;multa;juros;total';
    foreach ($cobrancas as $c) {
        $valores = array_map('Morada\Depois\Compartilhado\reais', [
            $c->taxa,
            $c->fundo,
            $c->debito,
            $c->multa,
            $c->juros,
            $c->total,
        ]);
        $linhas[] = implode(';', [$c->unidade, $c->morador, ...$valores]);
    }
    return implode("\n", $linhas) . "\n";
}
