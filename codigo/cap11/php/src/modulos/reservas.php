<?php
// Reservas assina PagamentoConfirmado: a reserva aguardando pagamento é confirmada.
// O assinante é idempotente, porque o broker entrega "pelo menos uma vez".
namespace Morada\Modulos;

final class Reservas
{
    private array $reservas = [];
    private array $processados = [];
    public array $registro = [];

    public function __construct(array $iniciais)
    {
        foreach ($iniciais as $r) {
            $this->reservas[$r['reserva']] = $r + [
                'situacao' => 'aguardando pagamento',
            ];
        }
    }

    public function aoConfirmarPagamento(array $e): void
    {
        if (isset($this->processados[$e['evento']])) {
            $this->registro[] = "reservas ignorou {$e['evento']} (repetido)";
            return;
        }
        $this->processados[$e['evento']] = true;
        $this->reservas[$e['reserva']]['situacao'] = 'confirmada';
        $this->registro[] =
            "reservas recebeu {$e['evento']}: " . "{$e['reserva']} confirmada";
    }

    public function linhas(): array
    {
        return array_map(
            fn($r) => implode(';', [
                $r['reserva'],
                $r['unidade'],
                $r['espaco'],
                $r['data'],
                $r['situacao'],
            ]),
            array_values($this->reservas),
        );
    }
}
