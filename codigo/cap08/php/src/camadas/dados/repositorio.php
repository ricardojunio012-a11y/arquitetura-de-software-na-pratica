<?php
// Camada de dados: onde as agendas ficam guardadas. Hoje, em memória; no capítulo 16,
// num banco de dados. As camadas de cima não percebem a troca.
namespace Morada\Camadas\Dados;

require_once __DIR__ . '/../dominio/dominio.php';

use Morada\Camadas\Dominio\{Agenda, Espaco, NaoEncontradoErro};

final class RepositorioDeAgendas
{
    /** @var array<string, Agenda> */
    private array $agendas = [];

    /** @param Espaco[] $espacos */
    public function __construct(array $espacos)
    {
        foreach ($espacos as $e) {
            $this->agendas[$e->id] = new Agenda($e);
        }
    }

    /** @return Agenda[] */
    public function todas(): array
    {
        return array_values($this->agendas);
    }

    public function doEspaco(string $id): Agenda
    {
        return $this->agendas[$id] ??
            throw new NaoEncontradoErro('espaço não encontrado');
    }

    public function daReserva(string $id): Agenda
    {
        foreach ($this->agendas as $agenda) {
            if ($agenda->tem($id)) {
                return $agenda;
            }
        }
        throw new NaoEncontradoErro('reserva não encontrada');
    }
}
