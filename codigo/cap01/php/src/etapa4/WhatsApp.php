<?php
// Novo canal de aviso: entra sem mexer no e-mail.
namespace Morada\Etapa4;

// Simula o envio gravando as mensagens num arquivo
final class WhatsAppEmArquivo implements Notificador
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
        $texto =
            "{$aviso->condominio}: taxa {$aviso->competencia->rotulo} " .
            "da unidade {$u['id']}: R$ " .
            Dinheiro::reais($c->total) .
            ", vence {$aviso->competencia->vencimento}.";
        if ($c->totalAte05 !== null) {
            $texto .=
                " Até {$aviso->competencia->limiteDesconto}: R$ " .
                Dinheiro::reais($c->totalAte05) .
                '.';
        }
        $texto .= " {$aviso->nomeDoPagamento}: {$aviso->codigoDePagamento}";
        return "Para: {$u['morador']['telefone']}\n$texto\n----\n";
    }
}
