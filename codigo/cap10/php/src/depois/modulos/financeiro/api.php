<?php
// API pública do Financeiro: a única porta que os outros módulos podem usar.
namespace Morada\Depois\Modulos\Financeiro;

require_once __DIR__ . '/interno/tabela-de-cobrancas.php';

use Morada\Depois\Modulos\Financeiro\Interno\{LinhaDeCobranca, TabelaDeCobrancas};

function reais(int $centavos): string
{
    return 'R$ ' . number_format($centavos / 100, 2, ',', '.');
}

final class Financeiro
{
    public function __construct(private readonly TabelaDeCobrancas $tabela) {}

    public function emitir(
        string $cobranca,
        string $unidade,
        int $valorCentavos,
        string $vencimento,
    ): string {
        $this->tabela->linhas[] = new LinhaDeCobranca(
            $cobranca,
            $unidade,
            $valorCentavos,
            $vencimento,
        );
        return "$unidade " . reais($valorCentavos) . " vence $vencimento";
    }

    public function pagar(string $cobranca, string $em): string
    {
        $this->tabela->buscar($cobranca)->situacao = 'paga';
        return "em $em";
    }

    public function parcelar(string $cobranca, int $parcelas): string
    {
        $linha = $this->tabela->buscar($cobranca);
        $linha->situacao = 'parcelada';
        $linha->parcelas = $parcelas;
        return "$parcelas parcelas";
    }

    // Regra de inadimplência: cobrança parcelada num acordo não é débito
    public function unidadeEmDia(string $unidade, string $hoje): bool
    {
        foreach ($this->tabela->linhas as $l) {
            if (
                $l->unidade === $unidade &&
                $l->situacao === 'aberta' &&
                $l->vencimento < $hoje
            ) {
                return false;
            }
        }
        return true;
    }
}
