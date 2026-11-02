<?php
// O módulo de Comunicação: envia avisos aos moradores. É idempotente pelo
// identificador do aviso: o mesmo aviso pedido duas vezes é enviado uma vez só.
namespace Morada;

final class Comunicacao
{
    public function __construct(private array $enviados = []) {}

    // Devolve true se enviou agora e false se o aviso já tinha sido enviado
    public function avisar(string $id, string $texto): bool
    {
        if (isset($this->enviados[$id])) {
            return false;
        }
        $this->enviados[$id] = true;
        return true;
    }

    public function enviados(): array
    {
        return $this->enviados;
    }
}
