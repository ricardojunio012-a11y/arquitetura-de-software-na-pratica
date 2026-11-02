<?php
// Serviço de aplicação: traduz um comando em chamadas ao domínio. Carrega o
// agregado, pede o trabalho a ele, salva e publica os eventos. Sem regra de negócio.
namespace Morada\Depois\Aplicacao;

require_once __DIR__ . '/repositorio.php';

use Morada\Depois\Dominio\{Agenda, ErroDeDominio, Periodo};

final readonly class Resultado
{
    public function __construct(
        public string $reserva,
        public string $comando,
        public string $situacao,
        public string $detalhe,
    ) {}
}

final class ServicoDeReservas
{
    /** @param callable $publicar */
    public function __construct(
        private readonly AgendasEmMemoria $agendas,
        private $publicar,
    ) {}

    public function executar(array $c): Resultado
    {
        try {
            return $c['tipo'] === 'reservar'
                ? $this->reservar($c)
                : $this->cancelar($c);
        } catch (ErroDeDominio $erro) {
            $situacao = $c['tipo'] === 'reservar' ? 'recusada' : 'não cancelada';
            return new Resultado(
                $c['reserva'],
                $c['tipo'],
                $situacao,
                $erro->getMessage(),
            );
        }
    }

    private function reservar(array $c): Resultado
    {
        $periodo = new Periodo($c['data'], $c['inicio'], $c['fim']);
        $agenda = $this->agendas->doEspaco($c['espaco']);
        $reserva = $agenda->reservar($c['reserva'], $c['unidade'], $periodo, $c['em']);
        $this->salvar($agenda);
        return new Resultado(
            $c['reserva'],
            $c['tipo'],
            'confirmada',
            (string) $reserva->taxa,
        );
    }

    private function cancelar(array $c): Resultado
    {
        $agenda = $this->agendas->daReserva($c['reserva']);
        $multa = $agenda->cancelar($c['reserva'], $c['em']);
        $this->salvar($agenda);
        $detalhe = $multa->centavos > 0 ? "multa $multa" : 'sem multa';
        return new Resultado($c['reserva'], $c['tipo'], 'cancelada', $detalhe);
    }

    private function salvar(Agenda $agenda): void
    {
        $this->agendas->salvar($agenda);
        foreach ($agenda->recolherEventos() as $evento) {
            ($this->publicar)($evento);
        }
    }
}
