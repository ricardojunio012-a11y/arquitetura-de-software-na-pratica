<?php
// O código novo: o módulo refatorado da etapa 5 mais a regra do limite, que já nasceu
// separada na etapa 6 (a classe-broto) e por isso migra sem ser reescrita.
namespace Morada\Etapa7;

require_once __DIR__ . '/../etapa5/reservas.php';
require_once __DIR__ . '/../etapa6/limite.php';

use Morada\Etapa5\Decisao;
use Morada\Etapa6\LimitePorMes;
use function Morada\Etapa5\{motivoDaRecusa, valorDaReserva};

function decidir(array $dados, \DateTimeImmutable $hoje, ?LimitePorMes $limite = null)
{
    $limite ??= new LimitePorMes();
    $unidades = array_column($dados['unidades'], null, 'id');
    $espacos = array_column($dados['espacos'], null, 'id');
    $aprovadas = [];
    $decisoes = [];
    foreach ($dados['pedidos'] as $pedido) {
        $unidade = $unidades[$pedido['unidade']];
        $motivo = motivoDaRecusa($pedido, $unidade, $hoje, $aprovadas);
        if ($motivo === null && $limite->atingido($pedido, $aprovadas)) {
            $motivo = 'limite de reservas do mês atingido';
        }
        $valor = 0;
        if ($motivo === null) {
            $aprovadas[] = $pedido;
            $valor = valorDaReserva($espacos[$pedido['espaco']], $pedido);
        }
        $decisoes[] = new Decisao($pedido, $unidade['email'], $motivo, $valor);
    }
    return $decisoes;
}
