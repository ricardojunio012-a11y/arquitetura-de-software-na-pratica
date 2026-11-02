<?php
// Novo meio de pagamento: entra sem mexer no cálculo nem no boleto.
namespace Morada\Etapa4;

// Código fictício: num sistema real, viria do provedor de Pix
final class Pix implements MeioDePagamento
{
    public function nome(): string
    {
        return 'Pix copia e cola';
    }

    public function gerarCodigo(
        string $condominioId,
        Competencia $competencia,
        Cobranca $cobranca,
    ): string {
        $id = $cobranca->unidade['id'];
        return "PIX-$condominioId-{$competencia->codigo}-$id-{$cobranca->total}";
    }
}
