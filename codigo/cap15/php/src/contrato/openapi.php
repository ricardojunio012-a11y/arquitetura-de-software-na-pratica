<?php
// Leitura do contrato OpenAPI: resolve referências e encontra a operação de um
// pedido.
namespace Morada\Contrato;

require_once __DIR__ . '/../../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

function lerContrato(string $arquivo): array
{
    return Yaml::parseFile($arquivo);
}

// Troca ['$ref' => '#/components/schemas/X'] pelo array apontado
function resolver(array $contrato, $no)
{
    while (is_array($no) && isset($no['$ref'])) {
        $atual = $contrato;
        foreach (explode('/', substr($no['$ref'], 2)) as $parte) {
            $atual = $atual[$parte];
        }
        $no = $atual;
    }
    return $no;
}

// O modelo de caminho do contrato que casa com um caminho concreto
function encontrarCaminho(array $contrato, string $caminho): ?string
{
    $partes = explode('/', $caminho);
    foreach (array_keys($contrato['paths']) as $modelo) {
        $pedacos = explode('/', $modelo);
        if (count($pedacos) !== count($partes)) {
            continue;
        }
        $casa = true;
        foreach ($pedacos as $i => $p) {
            $casa = $casa && (str_starts_with($p, '{') || $p === $partes[$i]);
        }
        if ($casa) {
            return $modelo;
        }
    }
    return null;
}
