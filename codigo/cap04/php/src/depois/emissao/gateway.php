<?php
// A abstração pertence ao Morada, não aos provedores: é a emissão que diz do que
// precisa. Cada provedor ganha um adaptador que implementa esta interface.
namespace Morada\Depois\Emissao;

require_once __DIR__ . '/../cobranca/cobranca.php';

use Morada\Depois\Cobranca\Cobranca;

final readonly class Prazos
{
    public function __construct(
        public string $vencimento,
        public string $descontoAte,
    ) {}
}

final readonly class Registro
{
    public function __construct(public string $unidade, public string $identificador) {}
}

interface GatewayDePagamento
{
    public function nome(): string;

    public function registrar(Cobranca $cobranca, Prazos $prazos): Registro;
}
