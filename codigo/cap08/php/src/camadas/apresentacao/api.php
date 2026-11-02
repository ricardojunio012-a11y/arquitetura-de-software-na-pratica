<?php
// Camada de apresentação: traduz HTTP em chamadas à aplicação e erros em
// códigos de status. É a única camada que conhece o Slim.
namespace Morada\Camadas\Apresentacao;

require_once __DIR__ . '/../aplicacao/servico-de-reservas.php';

use Morada\Camadas\Aplicacao\ServicoDeReservas;
use Morada\Camadas\Dominio\{NaoEncontradoErro, RegraVioladaErro};
use Psr\Http\Message\ResponseInterface as Resposta;
use Psr\Http\Message\ServerRequestInterface as Requisicao;
use Slim\App;
use Slim\Factory\AppFactory;

const OBRIGATORIOS = ['reserva', 'unidade', 'espaco', 'data', 'inicio', 'fim', 'em'];

class DadosInvalidosErro extends \RuntimeException {}

function json(Resposta $resposta, mixed $dados, int $status = 200): Resposta
{
    $resposta->getBody()->write(json_encode($dados, JSON_UNESCAPED_UNICODE));
    return $resposta
        ->withStatus($status)
        ->withHeader('Content-Type', 'application/json');
}

function criarApi(ServicoDeReservas $servico): App
{
    $app = AppFactory::create();
    $app->addBodyParsingMiddleware();

    $app->get(
        '/espacos',
        fn(Requisicao $req, Resposta $res) => json($res, $servico->listarEspacos()),
    );

    $app->post('/reservas', function (Requisicao $req, Resposta $res) use ($servico) {
        $corpo = (array) $req->getParsedBody();
        foreach (OBRIGATORIOS as $campo) {
            if (!isset($corpo[$campo])) {
                throw new DadosInvalidosErro("campo obrigatório: $campo");
            }
        }
        return json($res, $servico->reservar($corpo), 201);
    });

    $app->delete('/reservas/{id}', function (
        Requisicao $req,
        Resposta $res,
        array $args,
    ) use ($servico) {
        $em = $req->getQueryParams()['em'] ?? '';
        return json($res, $servico->cancelar($args['id'], $em));
    });

    $app->get('/espacos/{id}/reservas', function (
        Requisicao $req,
        Resposta $res,
        array $args,
    ) use ($servico) {
        return json($res, $servico->reservasDoEspaco($args['id']));
    });

    // Cada tipo de erro vira um código de status; o domínio não sabe disso
    $app->add(function (Requisicao $req, $proximo) use ($app) {
        try {
            return $proximo->handle($req);
        } catch (\Throwable $erro) {
            $status = match (true) {
                $erro instanceof DadosInvalidosErro => 400,
                $erro instanceof NaoEncontradoErro => 404,
                $erro instanceof RegraVioladaErro => 409,
                default => 500,
            };
            $resposta = $app->getResponseFactory()->createResponse();
            return json($resposta, ['erro' => $erro->getMessage()], $status);
        }
    });
    return $app;
}
