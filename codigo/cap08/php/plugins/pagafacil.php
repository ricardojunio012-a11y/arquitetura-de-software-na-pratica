<?php
// Plugin da PagaFácil: gera uma cobrança Pix identificada pela unidade.
use Morada\Plugins\{Cobranca, PluginDeBanco};

return new class implements PluginDeBanco {
    public function nome(): string
    {
        return 'pagafacil';
    }

    public function registrar(Cobranca $cobranca): string
    {
        return 'PIX-' . str_replace('-', '', $cobranca->unidade);
    }
};
