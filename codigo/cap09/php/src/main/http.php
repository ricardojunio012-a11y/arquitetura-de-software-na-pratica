<?php
// Uso: php http.php memoria|postgres <pasta-de-saída>
// Sobe o adaptador HTTP com o repositório escolhido, envia as requisições
// em memória e grava as respostas e o estado final das agendas.
require_once __DIR__ . '/montar.php';
require_once __DIR__ . '/../adaptadores/entrada/http.php';

use Slim\Psr7\Factory\{ServerRequestFactory, StreamFactory};

use function Morada\Adaptadores\Entrada\criarApi;

[, $repositorio, $saida] = $argv;
[$servico, $agendas] = montar($repositorio, true);
$api = criarApi($servico);
$dados = json_decode(file_get_contents('/dados/entrada/requisicoes.json'), true);

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
$estado = [];
foreach ($agendas->todas() as $a) {
    foreach ($a->reservas() as $r) {
        $periodo = "{$r->data} {$r->inicio}h-{$r->fim}h";
        $estado[] = "{$a->espaco->id};{$r->id};{$r->unidade};$periodo";
    }
}

@mkdir($saida, 0777, true);
file_put_contents("$saida/respostas.txt", implode("\n", $linhas) . "\n");
file_put_contents("$saida/agendas.txt", implode("\n", $estado) . "\n");
echo count($linhas) . " requisições ($repositorio); saída em $saida\n";
