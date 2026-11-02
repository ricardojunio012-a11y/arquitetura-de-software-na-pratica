<?php
// O centro do hexágono: as regras de reserva. Não importa nada de fora do domínio.
namespace Morada\Dominio;

class RegraVioladaErro extends \RuntimeException {}
class NaoEncontradoErro extends \RuntimeException {}

function reais(int $centavos): string
{
    return 'R$ ' . number_format($centavos / 100, 2, ',', '.');
}

final readonly class Espaco
{
    public function __construct(
        public string $id,
        public int $taxaCentavos,
        public int $antecedenciaMinimaDias,
    ) {}
}

final readonly class Reserva
{
    public function __construct(
        public string $id,
        public string $unidade,
        public string $data,
        public int $inicio,
        public int $fim,
        public int $taxaCentavos,
    ) {}
}

function dias(string $de, string $ate): int
{
    return intdiv(strtotime("$ate UTC") - strtotime("$de UTC"), 86400);
}

final class Agenda
{
    /** @var Reserva[] */
    private array $reservas;

    // Um repositório que carrega uma agenda salva passa as reservas existentes
    public function __construct(public readonly Espaco $espaco, array $reservas = [])
    {
        $this->reservas = $reservas;
    }

    public function reservar(
        string $id,
        string $unidade,
        string $data,
        int $inicio,
        int $fim,
        string $hoje,
    ): Reserva {
        if ($fim <= $inicio) {
            throw new RegraVioladaErro('período inválido');
        }
        if (dias($hoje, $data) < $this->espaco->antecedenciaMinimaDias) {
            throw new RegraVioladaErro('antecedência mínima não respeitada');
        }
        foreach ($this->reservas as $r) {
            if ($r->data === $data && $r->inicio < $fim && $inicio < $r->fim) {
                throw new RegraVioladaErro("horário sobreposto a {$r->id}");
            }
        }
        $base = $this->espaco->taxaCentavos;
        $fimDeSemana = (int) gmdate('N', strtotime("$data UTC")) >= 6;
        $taxa = $fimDeSemana ? $base + intdiv($base * 20 + 50, 100) : $base;
        $reserva = new Reserva($id, $unidade, $data, $inicio, $fim, $taxa);
        $this->reservas[] = $reserva;
        return $reserva;
    }

    // Devolve a multa em centavos: 50% da taxa se faltar menos de 2 dias
    public function cancelar(string $id, string $hoje): int
    {
        foreach ($this->reservas as $i => $r) {
            if ($r->id === $id) {
                array_splice($this->reservas, $i, 1);
                return dias($hoje, $r->data) < 2
                    ? intdiv($r->taxaCentavos * 50 + 50, 100)
                    : 0;
            }
        }
        throw new NaoEncontradoErro('reserva não encontrada');
    }

    // Em ordem de data e horário, qualquer que seja a ordem em que foram guardadas
    /** @return Reserva[] */
    public function reservas(): array
    {
        $lista = $this->reservas;
        usort($lista, fn($a, $b) => [$a->data, $a->inicio] <=> [$b->data, $b->inicio]);
        return $lista;
    }
}
