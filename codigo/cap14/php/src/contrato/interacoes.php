<?php
// As interações que o consumidor (o monólito) espera do provedor (a Comunicação).
// Cada uma diz o estado em que o provedor deve estar, o pedido e a resposta.
namespace Morada\Contrato;

const INTERACOES = [
    [
        'descricao' => 'envio de um aviso novo',
        'estado' => 'nenhum aviso foi enviado',
        'requisicao' => [
            'metodo' => 'POST',
            'caminho' => '/avisos',
            'corpo' => ['id' => 'E-P-001', 'texto' => 'pagamento recebido'],
        ],
        'resposta' => [
            'status' => 200,
            'corpo' => ['aviso' => 'E-P-001', 'situacao' => 'enviado'],
        ],
    ],
    [
        'descricao' => 'reenvio de um aviso já enviado',
        'estado' => 'o aviso E-P-001 já foi enviado',
        'requisicao' => [
            'metodo' => 'POST',
            'caminho' => '/avisos',
            'corpo' => ['id' => 'E-P-001', 'texto' => 'pagamento recebido'],
        ],
        'resposta' => [
            'status' => 200,
            'corpo' => ['aviso' => 'E-P-001', 'situacao' => 'repetido'],
        ],
    ],
    [
        'descricao' => 'aviso sem texto',
        'estado' => 'nenhum aviso foi enviado',
        'requisicao' => [
            'metodo' => 'POST',
            'caminho' => '/avisos',
            'corpo' => ['id' => 'E-P-002', 'texto' => ''],
        ],
        'resposta' => ['status' => 400, 'corpo' => ['erro' => 'texto obrigatório']],
    ],
];

// JSON com dois espaços de recuo, igual ao das outras linguagens
function json(mixed $dados): string
{
    $texto = json_encode(
        $dados,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
    );
    return preg_replace_callback(
        '/^( +)/m',
        fn($m) => str_repeat(' ', strlen($m[1]) / 2),
        $texto,
    );
}
