<?php
// Plugin do Banco Beta: outro formato de número, mesmo contrato.
use Morada\Plugins\{Cobranca, PluginDeBanco};

return new class implements PluginDeBanco {
    private int $ultimo = 0;

    public function nome(): string
    {
        return 'beta';
    }

    public function registrar(Cobranca $cobranca): string
    {
        $this->ultimo++;
        return sprintf('BETA/%04d', $this->ultimo);
    }
};
