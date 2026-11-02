<?php
// As portas do hexágono. Quem está dentro define as duas; quem está fora se adapta.
namespace Morada\Aplicacao;

require_once __DIR__ . '/../dominio/agenda.php';

use Morada\Dominio\Agenda;

// Porta de entrada: o que o sistema oferece, seja quem for que o acione
interface CasosDeUsoDeReservas
{
    public function listarEspacos(): array;

    public function reservar(array $pedido): array;

    public function cancelar(string $reserva, string $em): array;

    public function reservasDoEspaco(string $espaco): array;
}

// Porta de saída: o que o sistema precisa para guardar as agendas
interface RepositorioDeAgendas
{
    /** @return Agenda[] */
    public function todas(): array;

    public function doEspaco(string $espaco): Agenda;

    public function daReserva(string $reserva): Agenda;

    public function salvar(Agenda $agenda): void;
}
