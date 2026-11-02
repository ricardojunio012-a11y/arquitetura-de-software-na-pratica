<?php
// Os tipos de que a calculadora depende. Nenhum deles conhece uma regra concreta.
namespace Morada\Depois\Cobranca;

// Um item da cobrança. Condicional: só vale para pagamento até a data do desconto.
final readonly class Lancamento
{
    public function __construct(
        public string $codigo,
        public string $descricao,
        public int $valor,
        public bool $condicional = false,
    ) {}
}

// Cada regra olha a unidade e o que já foi lançado, e devolve o que acrescenta.
interface Regra
{
    /** @param Lancamento[] $lancados  @return Lancamento[] */
    public function aplicar(array $unidade, array $lancados): array;
}

function valorDe(array $lancados, string $codigo): int
{
    $doCodigo = array_filter($lancados, fn(Lancamento $l) => $l->codigo === $codigo);
    return array_sum(array_map(fn(Lancamento $l) => $l->valor, $doCodigo));
}
