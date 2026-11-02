<?php
// API pública de Reservas. O módulo declara o que precisa saber do Financeiro
// (SituacaoFinanceira) sem depender de como o Financeiro guarda os dados.
namespace Morada\Depois\Modulos\Reservas;

require_once __DIR__ . '/interno/agenda.php';

use Morada\Depois\Modulos\Reservas\Interno\Agenda;

interface SituacaoFinanceira
{
    public function unidadeEmDia(string $unidade, string $hoje): bool;
}

class RecusaErro extends \RuntimeException {}

final class Reservas
{
    private Agenda $agenda;

    public function __construct(
        array $espacos,
        private readonly SituacaoFinanceira $financeiro,
    ) {
        $this->agenda = new Agenda($espacos);
    }

    public function reservar(
        string $reserva,
        string $unidade,
        string $espaco,
        string $data,
        string $em,
    ): string {
        if (!$this->financeiro->unidadeEmDia($unidade, $em)) {
            throw new RecusaErro("unidade $unidade em débito");
        }
        if ($this->agenda->ocupante($espaco, $data) !== null) {
            throw new RecusaErro("$espaco já reservado em $data");
        }
        $this->agenda->registrar($reserva, $espaco, $data);
        return "$unidade $espaco $data";
    }
}
