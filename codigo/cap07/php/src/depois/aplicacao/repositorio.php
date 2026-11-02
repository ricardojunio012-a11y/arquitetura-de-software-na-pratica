<?php
// Repositório: um por agregado. Salva a agenda inteira, nunca uma reserva solta.
namespace Morada\Depois\Aplicacao;

require_once __DIR__ . '/../dominio/agenda.php';

use Morada\Depois\Dominio\{Agenda, ErroDeDominio, PoliticaDeUso};

// Em memória no laboratório; o capítulo 16 guarda as agendas num banco de dados
final class AgendasEmMemoria
{
    /** @var array<string, Agenda> */
    private array $agendas = [];

    /** @param array<string, PoliticaDeUso> $politicas */
    public function __construct(array $politicas)
    {
        foreach ($politicas as $espaco => $politica) {
            $this->agendas[$espaco] = new Agenda($espaco, $politica);
        }
    }

    public function doEspaco(string $espaco): Agenda
    {
        return $this->agendas[$espaco] ??
            throw new ErroDeDominio("espaço desconhecido: $espaco");
    }

    public function daReserva(string $reserva): Agenda
    {
        foreach ($this->agendas as $agenda) {
            if ($agenda->tem($reserva)) {
                return $agenda;
            }
        }
        throw new ErroDeDominio('reserva não encontrada');
    }

    public function salvar(Agenda $agenda): void
    {
        $this->agendas[$agenda->espaco] = $agenda;
    }

    /** @return Agenda[] */
    public function todas(): array
    {
        return array_values($this->agendas);
    }
}
