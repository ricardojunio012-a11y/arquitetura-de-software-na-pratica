<?php
// O Backend for Frontend do app do porteiro. Pertence ao time do app e fala a língua
// da tela: junta numa chamada o que o tablet precisa e recebe as operações feitas
// sem internet, em lote, aplicando cada uma uma vez só.
namespace Morada;

require_once __DIR__ . '/backend.php';

final class BffPorteiro
{
    public int $repetidas = 0;

    // Sem o terceiro argumento, os resultados ficam só na memória deste processo
    public function __construct(
        private readonly Portaria $portaria,
        private readonly Reservas $reservas,
        private \ArrayObject $resultados = new \ArrayObject(),
    ) {}

    // A tela inicial inteira numa chamada, só com os campos que o tablet mostra
    public function inicio(): array
    {
        $pendentes = [];
        foreach ($this->portaria->encomendas as $e) {
            if ($e['situacao'] === 'na portaria') {
                $pendentes[] = [
                    'encomenda' => $e['encomenda'],
                    'unidade' => $e['unidade'],
                    'versao' => $e['versao'],
                ];
            }
        }
        // Compara nome e reserva campo a campo: "Ana" não pode casar com "Maria Ana"
        $entrou = function (array $c): bool {
            foreach ($this->portaria->visitantes as $v) {
                if ($v['nome'] === $c['nome'] && $v['reserva'] === $c['reserva']) {
                    return true;
                }
            }
            return false;
        };
        $esperados = array_values(
            array_filter($this->reservas->convidados(), fn($c) => !$entrou($c)),
        );
        return [
            'encomendasPendentes' => $pendentes,
            'visitantesEsperados' => $esperados,
        ];
    }

    // Idempotente pelo id da operação: um lote reenviado não aplica nada duas vezes
    public function sincronizar(string $tablet, array $operacoes): array
    {
        $saida = [];
        foreach ($operacoes as $op) {
            if (isset($this->resultados[$op['id']])) {
                $this->repetidas++;
                $saida[] = [$op, $this->resultados[$op['id']]];
                continue;
            }
            $resultado =
                $op['tipo'] === 'registrarVisitante'
                    ? $this->portaria->registrarVisitante(
                        $op['nome'],
                        $op['reserva'],
                        $tablet,
                        $op['hora'],
                    )
                    : $this->portaria->mudar(
                        $op['encomenda'],
                        $op['tipo'] === 'entregar' ? 'entregue' : 'devolvida',
                        $op['versaoVista'],
                        $tablet,
                        $op['hora'],
                    );
            $this->resultados[$op['id']] = $resultado;
            $saida[] = [$op, $resultado];
        }
        return $saida;
    }
}
