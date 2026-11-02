<?php
// A tabela do Financeiro: dado privado do módulo. Nenhum outro módulo deve lê-la.
namespace Morada\Depois\Modulos\Financeiro\Interno;

final class LinhaDeCobranca
{
    public string $situacao = 'aberta';
    public int $parcelas = 1;

    public function __construct(
        public readonly string $cobranca,
        public readonly string $unidade,
        public readonly int $valorCentavos,
        public readonly string $vencimento,
    ) {}
}

final class TabelaDeCobrancas
{
    /** @var LinhaDeCobranca[] */
    public array $linhas = [];

    public function buscar(string $cobranca): LinhaDeCobranca
    {
        foreach ($this->linhas as $l) {
            if ($l->cobranca === $cobranca) {
                return $l;
            }
        }
        throw new \RuntimeException("cobrança $cobranca não encontrada");
    }
}
