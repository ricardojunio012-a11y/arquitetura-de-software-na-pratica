<?php
// "Agora a parte difícil": dois pedidos para o mesmo espaço e a mesma data
// chegam ao mesmo tempo. A intercalação é forçada, para a saída ser sempre igual:
// os dois passam pela cadeia antes de qualquer um gravar.
namespace Morada;

require_once __DIR__ . '/estado.php';
require_once __DIR__ . '/repositorio.php';

/**
 * @param Pedido[] $pedidos
 * @param callable(): array{0: Etapa, 1: RepositorioDeReservas} $montar
 */
function corrida(array $pedidos, callable $montar): array
{
    $primeiro = $pedidos[0];
    $linhas = [
        "Pedidos simultâneos: {$primeiro->espaco->nome} em " . dataBr($primeiro->data),
    ];
    foreach ([false, true] as $protegido) {
        $linhas[] = $protegido
            ? 'gravar só se o espaço estiver livre, numa operação só:'
            : 'verificar e depois gravar (check-then-act):';
        [$cadeia, $reservas] = $montar();
        // 1. Os dois verificam: o espaço está livre para ambos
        $aprovados = [];
        foreach ($pedidos as $p) {
            $d = $cadeia->avaliar($p);
            $texto = $d->aprovada ? 'passou na cadeia' : $d->motivo;
            $linhas[] = "  {$p->id} {$p->unidade->id}: $texto";
            if ($d->aprovada) {
                $aprovados[] = $p;
            }
        }
        // 2. Os dois gravam
        foreach ($aprovados as $p) {
            $reserva = new Reserva($p);
            $gravou = $protegido ? $reservas->salvarSeLivre($reserva) : true;
            if (!$protegido) {
                $reservas->salvar($reserva);
            }
            if ($gravou) {
                $reserva->aprovar();
            }
            $linhas[] = "  {$p->id} " . ($gravou ? 'gravada' : 'recusada na gravação');
        }
        $n = 0;
        foreach ($pedidos as $p) {
            if ($reservas->buscar($p->id)?->estado() === 'aprovada') {
                $n++;
            }
        }
        $resultado = $n === 1 ? '1 reserva aprovada' : "$n reservas aprovadas";
        $dupla = $n > 1 ? ' (reserva dupla)' : '';
        $linhas[] = "  resultado: $resultado$dupla";
    }
    return $linhas;
}
