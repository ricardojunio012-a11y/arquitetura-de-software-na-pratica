<?php
// Adaptador de entrada de linha de comando: os mesmos casos de uso, acionados por
// argumentos e respondidos em texto para uma pessoa ler no terminal.
namespace Morada\Adaptadores\Entrada;

require_once __DIR__ . '/../../aplicacao/portas.php';

use Morada\Aplicacao\CasosDeUsoDeReservas;

const USO_RESERVAR =
    'uso: reservar <reserva> <unidade> <espaco> ' . '<data> <inicio> <fim> <hoje>';

// Devolve o texto a mostrar e o código de saída do processo (0 = deu certo)
function executar(CasosDeUsoDeReservas $reservas, array $args): array
{
    $comando = $args[0] ?? '';
    $resto = array_slice($args, 1);
    try {
        switch ($comando) {
            case 'espacos':
                $linhas = array_map(
                    fn($e) => "{$e['id']}: taxa {$e['taxa']}, antecedência de " .
                        "{$e['antecedenciaMinimaDias']} dia(s)",
                    $reservas->listarEspacos(),
                );
                return [implode("\n", $linhas), 0];
            case 'reservar':
                if (count($resto) !== 7) {
                    return [USO_RESERVAR, 2];
                }
                [$reserva, $unidade, $espaco, $data, $inicio, $fim, $em] = $resto;
                $c = $reservas->reservar([
                    'reserva' => $reserva,
                    'unidade' => $unidade,
                    'espaco' => $espaco,
                    'data' => $data,
                    'inicio' => (int) $inicio,
                    'fim' => (int) $fim,
                    'em' => $em,
                ]);
                return ["{$c['reserva']} confirmada, taxa {$c['taxa']}", 0];
            case 'cancelar':
                $c = $reservas->cancelar($resto[0], $resto[1]);
                return ["{$c['reserva']} cancelada, multa {$c['multa']}", 0];
            case 'reservas':
                $lista = $reservas->reservasDoEspaco($resto[0]);
                if (!$lista) {
                    return ['nenhuma reserva', 0];
                }
                $linhas = array_map(
                    fn($r) => "{$r['reserva']} {$r['unidade']} {$r['periodo']}",
                    $lista,
                );
                return [implode("\n", $linhas), 0];
            default:
                return ['comandos: espacos, reservar, cancelar, reservas', 2];
        }
    } catch (\Throwable $erro) {
        return ["erro: {$erro->getMessage()}", 1];
    }
}
