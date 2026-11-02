<?php
// O back-end do Morada (o monólito): Portaria cuida das encomendas e dos visitantes;
// Reservas sabe quem são os convidados de cada festa. Nenhum dos dois conhece telas.
namespace Morada;

final class Portaria
{
    public array $encomendas = [];
    public array $visitantes = [];

    public function __construct(array $encomendas)
    {
        foreach ($encomendas as $e) {
            $this->encomendas[$e['encomenda']] = $e + [
                'situacao' => 'na portaria',
                'versao' => 1,
            ];
        }
    }

    // Concorrência otimista: muda só se ninguém mudou desde a versão vista
    public function mudar(
        string $id,
        string $situacao,
        int $versaoVista,
        string $tablet,
        string $hora,
    ): string {
        $e = &$this->encomendas[$id];
        if ($e['versao'] !== $versaoVista) {
            return "conflito: $id já {$e['situacao']} " .
                "pelo tablet {$e['por']} às {$e['hora']}";
        }
        $e =
            [
                'situacao' => $situacao,
                'versao' => $e['versao'] + 1,
                'por' => $tablet,
                'hora' => $hora,
            ] + $e;
        return 'aplicada';
    }

    public function registrarVisitante(
        string $nome,
        string $reserva,
        string $tablet,
        string $hora,
    ): string {
        $this->visitantes[] = [
            'nome' => $nome,
            'reserva' => $reserva,
            'tablet' => $tablet,
            'hora' => $hora,
        ];
        return 'aplicada';
    }
}

final class Reservas
{
    private array $convidados = [];

    public function __construct(array $festas)
    {
        foreach ($festas as $f) {
            foreach ($f['nomes'] as $nome) {
                $this->convidados[] = [
                    'nome' => $nome,
                    'reserva' => $f['reserva'],
                    'espaco' => $f['espaco'],
                ];
            }
        }
    }

    public function convidados(): array
    {
        return $this->convidados;
    }
}
