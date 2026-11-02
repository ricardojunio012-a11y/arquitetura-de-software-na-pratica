<?php
// O cliente que o monólito usa para falar com o serviço de Comunicação: o
// consumidor do contrato. Ele interpreta as respostas que o serviço promete dar.
namespace Morada\Monolito;

final class ClienteComunicacao
{
    public function __construct(private readonly string $url) {}

    public function avisar(string $id, string $texto): array
    {
        $contexto = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode(['id' => $id, 'texto' => $texto]),
                'ignore_errors' => true,
            ],
        ]);
        $resposta = file_get_contents("{$this->url}/avisos", false, $contexto);
        $status = (int) explode(' ', $http_response_header[0])[1];
        $corpo = json_decode($resposta, true);
        if ($status === 200) {
            return ['ok' => true, 'repetido' => $corpo['situacao'] === 'repetido'];
        }
        return ['ok' => false, 'erro' => $corpo['erro']];
    }
}
