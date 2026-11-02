<?php
// Simula o SDK de um banco emissor de boletos. A API é do banco, não do Morada:
// valores em reais com ponto e datas no formato DD/MM/AAAA.
namespace Morada\Externos;

class ClienteBancoAlfa
{
    // Boletos emitidos no "servidor" do banco (o teste da versão antes usa)
    public static int $emitidos = 0;

    public function emitirBoleto(array $pedido): array
    {
        if (empty($pedido['pagador']) || empty($pedido['valor'])) {
            throw new \InvalidArgumentException('pedido incompleto');
        }
        self::$emitidos++;
        return ['nossoNumero' => sprintf('%07d', self::$emitidos)];
    }
}
