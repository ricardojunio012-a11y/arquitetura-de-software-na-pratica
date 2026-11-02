<?php
// Recebe o pedido, consulta a cadeia de aprovação, guarda e anuncia o resultado.
namespace Morada;

require_once __DIR__ . '/aprovacao.php';
require_once __DIR__ . '/eventos.php';
require_once __DIR__ . '/estado.php';

final class ServicoDeReservas
{
    public function __construct(
        private readonly Etapa $aprovacao,
        private readonly RepositorioDeReservas $reservas,
        private readonly Barramento $eventos,
    ) {}

    public function solicitar(Pedido $pedido): Decisao
    {
        $reserva = new Reserva($pedido);
        $decisao = $this->aprovacao->avaliar($pedido);
        // A cadeia viu o espaço livre, mas outro pedido pode ter gravado depois:
        // a gravação confere de novo, numa operação só (passo 6 do laboratório)
        if ($decisao->aprovada && !$this->reservas->salvarSeLivre($reserva)) {
            $decisao = new Decisao(false, 'espaço já reservado nesta data');
        }
        if ($decisao->aprovada) {
            $reserva->aprovar();
            $this->eventos->publicar(new Evento('ReservaConfirmada', $pedido));
        } else {
            $reserva->recusar();
            $this->reservas->salvar($reserva);
            $this->eventos->publicar(
                new Evento('ReservaRecusada', $pedido, $decisao->motivo),
            );
        }
        return $decisao;
    }

    // O estado decide se a reserva pode ser cancelada
    public function cancelar(string $id): string
    {
        $reserva = $this->reservas->buscar($id);
        if ($reserva === null) {
            throw new \DomainException("reserva $id não encontrada");
        }
        $antes = $reserva->estado();
        $reserva->cancelar();
        return "$antes -> {$reserva->estado()}";
    }
}
