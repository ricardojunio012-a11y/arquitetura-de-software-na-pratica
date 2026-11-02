<?php
// Regras de cálculo da taxa condominial: não lê arquivo nem envia nada.
namespace Morada\Etapa3;

final class Cobranca
{
    public function __construct(
        public readonly array $unidade,
        public readonly int $taxa,
        public readonly int $fundo,
        public readonly int $debito,
        public readonly int $multa,
        public readonly int $juros,
        public readonly int $total,
    ) {}
}

final class Calculo
{
    private const FUNDO_DE_RESERVA = 10; // % sobre a taxa
    private const MULTA = 2; // % sobre o débito (limite do Código Civil, art. 1.336)

    // 1% ao mês, proporcional aos dias de atraso
    public static function jurosDeMora(int $centavos, int $dias): int
    {
        return intdiv($centavos * $dias + 1500, 3000);
    }

    public static function calcularCobranca(
        int $despesasCentavos,
        array $unidade,
        \DateTimeImmutable $hoje,
    ): Cobranca {
        $taxa = Dinheiro::parteDe($despesasCentavos, $unidade['fracaoMilionesimos']);
        $fundo = Dinheiro::percentual($taxa, self::FUNDO_DE_RESERVA);
        $debito = 0;
        $multa = 0;
        $juros = 0;
        if ($unidade['debitoAnterior'] !== null) {
            $debito = $unidade['debitoAnterior']['valorCentavos'];
            $multa = Dinheiro::percentual($debito, self::MULTA);
            $juros = self::jurosDeMora(
                $debito,
                Competencia::diasDesde($unidade['debitoAnterior']['vencimento'], $hoje),
            );
        }
        return new Cobranca(
            $unidade,
            $taxa,
            $fundo,
            $debito,
            $multa,
            $juros,
            $taxa + $fundo + $debito + $multa + $juros,
        );
    }
}
