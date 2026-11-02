<?php
// A camada HTTP do serviço de Comunicação: o provedor do contrato. A função
// atender recebe o pedido e devolve status e corpo; servidor.php a liga ao HTTP.
namespace Morada\Comunicacao;

require_once __DIR__ . '/dominio.php';

function atender(
    Comunicacao $comunicacao,
    string $metodo,
    string $caminho,
    string $corpo,
): array {
    if ($metodo !== 'POST' || $caminho !== '/avisos') {
        return [404, ['erro' => 'não encontrado']];
    }
    $aviso = json_decode($corpo, true);
    try {
        $situacao = $comunicacao->avisar($aviso['id'], $aviso['texto']);
        return [200, ['aviso' => $aviso['id'], 'situacao' => $situacao]];
    } catch (DadosInvalidosErro $erro) {
        return [400, ['erro' => $erro->getMessage()]];
    }
}

// Sobe um servidor HTTP do PHP com o roteador indicado e espera a porta abrir
function subir(string $roteador, int $porta, array $ambiente = []): mixed
{
    $processo = proc_open(
        ['php', '-S', "127.0.0.1:$porta", $roteador],
        [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
        $tubos,
        null,
        $ambiente + getenv(),
    );
    for ($i = 0; $i < 100 && !@fsockopen('127.0.0.1', $porta); $i++) {
        usleep(50000);
    }
    return $processo;
}
