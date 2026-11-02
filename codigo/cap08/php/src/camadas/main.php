<?php
// Uso: php main.php <requisicoes.json> <pasta-de-saída>
// Monta as camadas de baixo para cima e envia as requisições à API, em memória
// (sem abrir porta), gravando cada resposta.
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/apresentacao/api.php';

use Morada\Camadas\Aplicacao\ServicoDeReservas;
use Morada\Camadas\Dados\RepositorioDeAgendas;
use Morada\Camadas\Dominio\Espaco;
use Slim\Psr7\Factory\{ServerRequestFactory, StreamFactory};

use function Morada\Camadas\Apresentacao\criarApi;

[, $entrada, $saida] = $argv;
$dados = json_decode(file_get_contents($entrada), true);
$espacos = array_map(
    fn($e) => new Espaco($e['id'], $e['taxaCentavos'], $e['antecedenciaMinimaDias']),
    $dados['espacos'],
);
$api = criarApi(new ServicoDeReservas(new RepositorioDeAgendas($espacos)));

$linhas = [];
foreach ($dados['requisicoes'] as $r) {
    $req = (new ServerRequestFactory())->createServerRequest(
        $r['metodo'],
        $r['caminho'],
    );
    parse_str(parse_url($r['caminho'], PHP_URL_QUERY) ?? '', $consulta);
    $req = $req->withQueryParams($consulta);
    if (isset($r['corpo'])) {
        $req = $req
            ->withHeader('Content-Type', 'application/json')
            ->withBody((new StreamFactory())->createStream(json_encode($r['corpo'])));
    }
    $resposta = $api->handle($req);
    $corpo = json_encode(
        json_decode((string) $resposta->getBody()),
        JSON_UNESCAPED_UNICODE,
    );
    $linhas[] = "{$r['metodo']} {$r['caminho']} -> {$resposta->getStatusCode()} $corpo";
}
@mkdir($saida, 0777, true);
file_put_contents("$saida/respostas.txt", implode("\n", $linhas) . "\n");
echo count($linhas) . " requisições; saída em $saida\n";
