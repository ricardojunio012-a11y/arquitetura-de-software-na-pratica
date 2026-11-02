<?php
// Os casos de uso implementam a porta de entrada e usam a porta de saída. Não sabem
// se foram chamados por HTTP ou pelo terminal, nem onde as agendas são guardadas.
namespace Morada\Aplicacao;

require_once __DIR__ . '/portas.php';

use function Morada\Dominio\reais;

final class ServicoDeReservas implements CasosDeUsoDeReservas
{
    public function __construct(private readonly RepositorioDeAgendas $agendas) {}

    public function listarEspacos(): array
    {
        return array_map(
            fn($a) => [
                'id' => $a->espaco->id,
                'taxa' => reais($a->espaco->taxaCentavos),
                'antecedenciaMinimaDias' => $a->espaco->antecedenciaMinimaDias,
            ],
            $this->agendas->todas(),
        );
    }

    public function reservar(array $p): array
    {
        $agenda = $this->agendas->doEspaco($p['espaco']);
        $r = $agenda->reservar(
            $p['reserva'],
            $p['unidade'],
            $p['data'],
            $p['inicio'],
            $p['fim'],
            $p['em'],
        );
        $this->agendas->salvar($agenda);
        return [
            'reserva' => $r->id,
            'situacao' => 'confirmada',
            'taxa' => reais($r->taxaCentavos),
        ];
    }

    public function cancelar(string $reserva, string $em): array
    {
        $agenda = $this->agendas->daReserva($reserva);
        $multa = $agenda->cancelar($reserva, $em);
        $this->agendas->salvar($agenda);
        return [
            'reserva' => $reserva,
            'situacao' => 'cancelada',
            'multa' => reais($multa),
        ];
    }

    public function reservasDoEspaco(string $espaco): array
    {
        return array_map(
            fn($r) => [
                'reserva' => $r->id,
                'unidade' => $r->unidade,
                'periodo' => "{$r->data} {$r->inicio}h-{$r->fim}h",
            ],
            $this->agendas->doEspaco($espaco)->reservas(),
        );
    }
}
