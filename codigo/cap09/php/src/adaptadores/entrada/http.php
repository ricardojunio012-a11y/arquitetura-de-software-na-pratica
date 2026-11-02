<?php
// Adaptador de entrada HTTP: traduz requisições em chamadas à porta de entrada e
// erros em códigos de status. Só ele conhece o Slim.
namespace Morada\Adaptadores\Entrada;

require_once __DIR__ . '/../../aplicacao/portas.php';

use Morada\Aplicacao\CasosDeUsoDeReservas;
use Morada\Dominio\{NaoEncontradoErro, RegraVioladaErro};
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

function criarApi(CasosDeUsoDeReservas $reservas): App
{
    $app = AppFactory::create();
    $app->addBodyParsingMiddleware();

    $app->get(
        '/espacos',
        fn(Requisicao $req, Resposta $res) => json($res, $reservas->listarEspacos()),
    );

    $app->post('/reservas', function (Requisicao $req, Resposta $res) use ($reservas) {
        $corpo = (array) $req->getParsedBody();
        foreach (OBRIGATORIOS as $campo) {
            if (!isset($corpo[$campo])) {
                throw new DadosInvalidosErro("campo obrigatório: $campo");
            }
        }
        return json($res, $reservas->reservar($corpo), 201);
    });

    $app->delete('/reservas/{id}', function (
        Requisicao $req,
        Resposta $res,
        array $args,
    ) use ($reservas) {
        $em = $req->getQueryParams()['em'] ?? '';
        return json($res, $reservas->cancelar($args['id'], $em));
    });

    $app->get('/espacos/{id}/reservas', function (
        Requisicao $req,
        Resposta $res,
        array $args,
    ) use ($reservas) {
        return json($res, $reservas->reservasDoEspaco($args['id']));
    });

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
