<?php
// O relatório de cobranças do mês, para a administradora.
namespace Morada\Etapa3;

final class RelatorioDeCobrancas
{
    private array $linhas;

    public function __construct(string $condominio, Competencia $competencia)
    {
        $this->linhas = [
            "# Cobranças {$competencia->rotulo} - $condominio - " .
            "vencimento {$competencia->vencimento}",
            'unidade;morador;taxa;fundo;debito;multa;juros;total;pagamento',
        ];
    }

    public function adicionar(Cobranca $c, string $codigoDePagamento): void
    {
        $valores = array_map(
            [Dinheiro::class, 'reais'],
            [$c->taxa, $c->fundo, $c->debito, $c->multa, $c->juros, $c->total],
        );
        $this->linhas[] = implode(';', [
            $c->unidade['id'],
            $c->unidade['morador']['nome'],
            ...$valores,
            $codigoDePagamento,
        ]);
    }

    public function salvar(string $arquivo): void
    {
        file_put_contents($arquivo, implode("\n", $this->linhas) . "\n");
    }
}
