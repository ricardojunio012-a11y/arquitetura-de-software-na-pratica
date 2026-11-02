<?php
// Como o morador paga. O cálculo não sabe que meio é esse.
namespace Morada\Etapa3;

interface MeioDePagamento
{
    public function nome(): string;

    public function gerarCodigo(
        string $condominioId,
        Competencia $competencia,
        Cobranca $cobranca,
    ): string;
}

// Código fictício: num sistema real, viria do banco emissor
final class Boleto implements MeioDePagamento
{
    public function nome(): string
    {
        return 'Boleto';
    }

    public function gerarCodigo(
        string $condominioId,
        Competencia $competencia,
        Cobranca $cobranca,
    ): string {
        $id = $cobranca->unidade['id'];
        return "BOL-$condominioId-{$competencia->codigo}-$id-{$cobranca->total}";
    }
}
