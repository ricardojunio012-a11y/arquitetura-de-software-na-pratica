<?php
// Simula a API de um provedor de Pix. Outra empresa, outro formato: valores em
// centavos, datas ISO e um identificador (txid) escolhido por quem cria a cobrança.
namespace Morada\Externos;

class PagaFacilApi
{
    public function criarCobranca(array $cobranca): array
    {
        if ($cobranca['valorCentavos'] <= 0) {
            throw new \InvalidArgumentException('valor inválido');
        }
        return ['txid' => $cobranca['txid'], 'status' => 'ATIVA'];
    }
}
