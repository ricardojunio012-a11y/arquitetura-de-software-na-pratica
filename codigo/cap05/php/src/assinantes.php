<?php
// Quem reage aos eventos de reserva. Cada um faz uma coisa e não conhece os outros.
namespace Morada;

require_once __DIR__ . '/eventos.php';
require_once __DIR__ . '/notificacao.php';

final class NotificarMorador implements Assinante
{
    public function __construct(private readonly FabricaDeCanais $fabrica) {}

    public function nome(): string
    {
        return 'NotificarMorador';
    }

    public function tratar(Evento $evento): void
    {
        $p = $evento->pedido;
        $quando = "{$p->espaco->nome} em " . dataBr($p->data);
        $mensagem =
            $evento->tipo === 'ReservaConfirmada'
                ? new Mensagem(
                    'Reserva confirmada',
                    "$quando. Taxa de uso: R$ " . reais($p->espaco->taxaCentavos) . '.',
                )
                : new Mensagem('Reserva recusada', "$quando: {$evento->motivo}.");
        $morador = $p->unidade->morador;
        $this->fabrica->para($morador)->enviar($morador, $mensagem);
    }
}

final class LancarTaxaDeUso implements Assinante
{
    public function __construct(private array &$taxas) {}

    public function nome(): string
    {
        return 'LancarTaxaDeUso';
    }

    public function tratar(Evento $evento): void
    {
        $p = $evento->pedido;
        $descricao = "Taxa de uso: {$p->espaco->nome} em " . dataBr($p->data);
        $this->taxas[] =
            "{$p->unidade->id};$descricao;" . reais($p->espaco->taxaCentavos);
    }
}

final class AvisarPortaria implements Assinante
{
    public function __construct(private array &$lista) {}

    public function nome(): string
    {
        return 'AvisarPortaria';
    }

    public function tratar(Evento $evento): void
    {
        $p = $evento->pedido;
        $this->lista[] =
            dataBr($p->data) .
            " {$p->espaco->nome}: {$p->unidade->id} {$p->unidade->morador->nome}";
    }
}
