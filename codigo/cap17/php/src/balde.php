<?php
// Balde de fichas: começa cheio, com "rajada" fichas, e ganha "porSegundo" fichas por
// segundo, sem passar do máximo. Cada pedido gasta uma ficha; sem ficha, o pedido é
// recusado. As fichas são contadas em milésimos para a conta ficar exata com o tempo
// em milissegundos.
namespace Morada;

final class BaldeDeFichas
{
    private int $milesimos;
    private int $ultimo = 0;

    public function __construct(
        private readonly int $rajada,
        private readonly int $porSegundo,
    ) {
        $this->milesimos = $rajada * 1000;
    }

    public function permite(int $agoraMs): bool
    {
        $ganho = ($agoraMs - $this->ultimo) * $this->porSegundo;
        $this->milesimos = min($this->rajada * 1000, $this->milesimos + $ganho);
        $this->ultimo = $agoraMs;
        if ($this->milesimos < 1000) {
            return false;
        }
        $this->milesimos -= 1000;
        return true;
    }
}
