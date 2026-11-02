<?php
// Plugin do Banco Alfa: numera os boletos em sequência, com cinco dígitos.
use Morada\Plugins\{Cobranca, PluginDeBanco};

return new class implements PluginDeBanco {
    private int $ultimo = 0;

    public function nome(): string
    {
        return 'alfa';
    }

    public function registrar(Cobranca $cobranca): string
    {
        $this->ultimo++;
        return sprintf('ALFA-%05d', $this->ultimo);
    }
};
