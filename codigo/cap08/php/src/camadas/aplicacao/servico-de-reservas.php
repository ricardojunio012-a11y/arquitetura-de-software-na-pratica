<?php
// Camada de aplicação: os casos de uso. Recebe dados simples, chama o domínio e o
// repositório e devolve dados simples. Não sabe que existe HTTP.
namespace Morada\Camadas\Aplicacao;

require_once __DIR__ . '/../dados/repositorio.php';

use Morada\Camadas\Dados\RepositorioDeAgendas;

use function Morada\Camadas\Dominio\reais;

final class ServicoDeReservas
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
        return [
            'reserva' => $r->id,
            'situacao' => 'confirmada',
            'taxa' => reais($r->taxaCentavos),
        ];
    }

    public function cancelar(string $reserva, string $em): array
    {
        $multa = $this->agendas->daReserva($reserva)->cancelar($reserva, $em);
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
