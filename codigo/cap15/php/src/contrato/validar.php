<?php
// Confere uma resposta real contra o contrato: o status precisa estar documentado, o
// tipo de conteúdo também, e o corpo precisa seguir o esquema. O corpo chega como
// json_decode sem o modo associativo: objetos JSON viram stdClass, listas viram array.
namespace Morada\Contrato;

require_once __DIR__ . '/openapi.php';

function tipoDe($valor): string
{
    return match (true) {
        $valor === null => 'null',
        is_bool($valor) => 'boolean',
        is_int($valor) => 'integer',
        is_float($valor) => 'number',
        is_string($valor) => 'string',
        is_array($valor) => 'array',
        default => 'object',
    };
}

function validarEsquema(array $contrato, array $esquema, $valor, string $onde): array
{
    $esquema = resolver($contrato, $esquema);
    $tipos = (array) ($esquema['type'] ?? []);
    $tipo = tipoDe($valor);
    if ($tipos && !in_array($tipo, $tipos, true)) {
        return ["$onde: esperado " . implode(' ou ', $tipos) . ", recebido $tipo"];
    }
    if (isset($esquema['enum']) && !in_array($valor, $esquema['enum'], true)) {
        return ["$onde: valor fora do enum: $valor"];
    }
    $erros = [];
    if ($tipo === 'object') {
        foreach ($esquema['required'] ?? [] as $campo) {
            if (!property_exists($valor, $campo)) {
                $erros[] = "$onde.$campo: campo obrigatório ausente";
            }
        }
        foreach ($esquema['properties'] ?? [] as $campo => $sub) {
            if (property_exists($valor, $campo)) {
                $erros = [
                    ...$erros,
                    ...validarEsquema($contrato, $sub, $valor->$campo, "$onde.$campo"),
                ];
            }
        }
    }
    if ($tipo === 'array' && isset($esquema['items'])) {
        foreach ($valor as $i => $item) {
            $erros = [
                ...$erros,
                ...validarEsquema($contrato, $esquema['items'], $item, "{$onde}[$i]"),
            ];
        }
    }
    return $erros;
}

function validarResposta(
    array $contrato,
    string $metodo,
    string $caminho,
    int $status,
    string $tipo,
    $corpo,
): array {
    $modelo = encontrarCaminho($contrato, $caminho);
    $operacao = $modelo
        ? $contrato['paths'][$modelo][strtolower($metodo)] ?? null
        : null;
    if (!$operacao) {
        return ["$metodo $caminho: operação fora do contrato"];
    }
    $nome = "$metodo $modelo $status";
    $resposta = resolver($contrato, $operacao['responses'][$status] ?? null);
    if (!$resposta) {
        return ["$nome: status não documentado"];
    }
    $conteudo = $resposta['content'][$tipo] ?? null;
    if (!$conteudo) {
        return ["$nome: tipo de conteúdo não documentado: $tipo"];
    }
    $erros = validarEsquema($contrato, $conteudo['schema'], $corpo, '$');
    return array_map(fn($erro) => "$nome: $erro", $erros);
}
