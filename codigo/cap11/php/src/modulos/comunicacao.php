<?php
// Comunicação assina o mesmo evento e avisa o morador. Não conhece Reservas:
// tudo o que precisa veio dentro do evento.
namespace Morada\Modulos;

require_once __DIR__ . '/../eventos.php';

use function Morada\reais;

final class Comunicacao
{
    private array $processados = [];
    public array $avisos = [];
    public array $registro = [];

    public function aoConfirmarPagamento(array $e): void
    {
        if (isset($this->processados[$e['evento']])) {
            $this->registro[] = "comunicacao ignorou {$e['evento']} (repetido)";
            return;
        }
        $this->processados[$e['evento']] = true;
        $valor = reais($e['valorCentavos']);
        $this->avisos[] =
            "{$e['unidade']}: pagamento {$e['pagamento']} de $valor recebido; " .
            "reserva {$e['reserva']} confirmada";
        $this->registro[] =
            "comunicacao recebeu {$e['evento']}: " . "avisou {$e['unidade']}";
    }
}
