<?php
// Como o morador fica sabendo da cobrança.
namespace Morada\Etapa4;

final class Aviso
{
    public function __construct(
        public readonly string $condominio,
        public readonly Competencia $competencia,
        public readonly Cobranca $cobranca,
        public readonly string $nomeDoPagamento,
        public readonly string $codigoDePagamento,
    ) {}
}

interface Notificador
{
    public function notificar(Aviso $aviso): void;
}

// Simula o envio gravando as mensagens num arquivo
final class EmailEmArquivo implements Notificador
{
    public function __construct(private readonly string $arquivo)
    {
        file_put_contents($arquivo, '');
    }

    public function notificar(Aviso $aviso): void
    {
        file_put_contents($this->arquivo, self::formatar($aviso), FILE_APPEND);
    }

    public static function formatar(Aviso $aviso): string
    {
        $c = $aviso->cobranca;
        $u = $c->unidade;
        $linhas = [
            "Para: {$u['morador']['email']}",
            "Assunto: Taxa condominial {$aviso->competencia->rotulo} - " .
            "{$aviso->condominio} - Unidade {$u['id']}",
            '',
            "Olá, {$u['morador']['nome']}.",
            '',
            "A taxa condominial de {$aviso->competencia->rotulo} " .
            "da unidade {$u['id']} está disponível.",
            'Valor: R$ ' . Dinheiro::reais($c->total),
            "Vencimento: {$aviso->competencia->vencimento}",
        ];
        if ($c->totalAte05 !== null) {
            $linhas[] =
                "Pagando até {$aviso->competencia->limiteDesconto}, " .
                "o valor cai para R$ " .
                Dinheiro::reais($c->totalAte05) .
                '.';
        }
        if ($c->debito > 0) {
            $linhas[] =
                'Inclui débito anterior de R$ ' .
                Dinheiro::reais($c->debito) .
                ', com multa de R$ ' .
                Dinheiro::reais($c->multa) .
                ' e juros de R$ ' .
                Dinheiro::reais($c->juros) .
                '.';
        }
        array_push(
            $linhas,
            "{$aviso->nomeDoPagamento}: {$aviso->codigoDePagamento}",
            '',
            "Administração do {$aviso->condominio}",
            '----',
        );
        return implode("\n", $linhas) . "\n";
    }
}
