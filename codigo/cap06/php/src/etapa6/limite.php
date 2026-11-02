<?php
// Classe-broto (sprout class, Feathers): a regra nova nasce fora do código legado,
// numa classe nova, pequena e com testes próprios. O legado só ganha uma chamada.
namespace Morada\Etapa6;

final class LimitePorMes
{
    // Reservas por unidade, por espaço, no mesmo mês
    public const PADRAO = ['salao' => 1, 'churrasqueira' => 2];

    public function __construct(private readonly array $limites = self::PADRAO) {}

    public function atingido(array $pedido, array $aprovadas): bool
    {
        $limite = $this->limites[$pedido['espaco']] ?? null;
        if ($limite === null) {
            return false;
        }
        $mes = substr($pedido['data'], 0, 7);
        $feitas = array_filter(
            $aprovadas,
            fn($r) => $r['unidade'] === $pedido['unidade'] &&
                $r['espaco'] === $pedido['espaco'] &&
                substr($r['data'], 0, 7) === $mes,
        );
        return count($feitas) >= $limite;
    }
}
