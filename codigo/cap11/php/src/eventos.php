<?php
// Evento de integração publicado pelo Financeiro. Carrega os dados de que os
// assinantes precisam (transferência de estado), para que não tenham de consultá-lo.
namespace Morada;

// O identificador do evento é estável: o mesmo pagamento gera sempre o mesmo evento
function eventoDe(array $p): array
{
    return [
        'evento' => "E-{$p['pagamento']}",
        'tipo' => 'PagamentoConfirmado',
        'pagamento' => $p['pagamento'],
        'unidade' => $p['unidade'],
        'reserva' => $p['reserva'],
        'valorCentavos' => $p['valorCentavos'],
    ];
}

function reais(int $centavos): string
{
    return 'R$ ' . number_format($centavos / 100, 2, ',', '.');
}
