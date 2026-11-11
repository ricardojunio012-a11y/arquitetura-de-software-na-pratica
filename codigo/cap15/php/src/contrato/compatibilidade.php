<?php
// Compara o contrato publicado com uma proposta e lista as mudanças. Incompatível é
// o que pode quebrar um cliente que já funciona: tirar algo que ele usa, mudar o que
// ele recebe ou exigir algo que ele não envia.
namespace Morada\Contrato;

require_once __DIR__ . '/openapi.php';

final class Mudanca
{
    public function __construct(
        public readonly bool $compativel,
        public readonly string $texto,
    ) {}
}

final class Comparacao
{
    /** @var Mudanca[] */
    public array $mudancas = [];

    public function __construct(
        private readonly array $antigo,
        private readonly array $novo,
    ) {}

    public function anotar(bool $compativel, string $texto): void
    {
        $this->mudancas[] = new Mudanca($compativel, $texto);
    }

    public function esquemas(
        array $a,
        array $b,
        string $lado,
        string $rotulo,
        string $campo,
    ): void {
        $a = resolver($this->antigo, $a);
        $b = resolver($this->novo, $b);
        $nome = $campo !== '' ? $campo : '(raiz)';
        $tipoA = implode(' ou ', (array) ($a['type'] ?? []));
        $tipoB = implode(' ou ', (array) ($b['type'] ?? []));
        if ($tipoA !== $tipoB) {
            $this->anotar(false, "$rotulo: tipo mudou: $nome ($tipoA → $tipoB)");
            return;
        }
        if (isset($a['enum'], $b['enum'])) {
            // Valor novo na resposta quebra quem trata todos os casos; valor a menos
            // no pedido quebra quem o envia
            [$de, $para, $aviso] =
                $lado === 'resposta'
                    ? [$a['enum'], $b['enum'], 'valor novo no enum']
                    : [$b['enum'], $a['enum'], 'valor removido do enum'];
            foreach ($para as $valor) {
                if (!in_array($valor, $de, true)) {
                    $this->anotar(false, "$rotulo: $aviso: $nome = $valor");
                }
            }
        }
        $propsA = $a['properties'] ?? [];
        $propsB = $b['properties'] ?? [];
        $obrigA = $a['required'] ?? [];
        $obrigB = $b['required'] ?? [];
        $dentro = fn(string $p) => $campo !== '' ? "$campo.$p" : $p;
        foreach ($propsA as $p => $esquemaA) {
            if (!isset($propsB[$p])) {
                $this->anotar(false, "$rotulo: campo removido: {$dentro($p)}");
                continue;
            }
            if (
                $lado === 'resposta' &&
                in_array($p, $obrigA) &&
                !in_array($p, $obrigB)
            ) {
                $this->anotar(
                    false,
                    "$rotulo: campo deixou de ser garantido: {$dentro($p)}",
                );
            }
            if ($lado === 'pedido' && !in_array($p, $obrigA) && in_array($p, $obrigB)) {
                $this->anotar(
                    false,
                    "$rotulo: campo passou a ser obrigatório: {$dentro($p)}",
                );
            }
            $this->esquemas($esquemaA, $propsB[$p], $lado, $rotulo, $dentro($p));
        }
        foreach (array_keys($propsB) as $p) {
            if (isset($propsA[$p])) {
                continue;
            }
            if ($lado === 'resposta') {
                $this->anotar(true, "$rotulo: campo novo: {$dentro($p)}");
            } elseif (in_array($p, $obrigB)) {
                $this->anotar(false, "$rotulo: campo novo obrigatório: {$dentro($p)}");
            } else {
                $this->anotar(true, "$rotulo: campo novo opcional: {$dentro($p)}");
            }
        }
        if (isset($a['items'], $b['items'])) {
            $this->esquemas($a['items'], $b['items'], $lado, $rotulo, "{$campo}[]");
        }
    }

    public function parametros(array $a, array $b, string $nome): void
    {
        $chave = fn(array $p) => "{$p['in']} {$p['name']}";
        $novos = [];
        foreach ($b as $p) {
            $novos[$chave($p)] = $p;
        }
        foreach ($a as $pa) {
            $pb = $novos[$chave($pa)] ?? null;
            if ($pb === null) {
                $this->anotar(false, "$nome: parâmetro removido: {$pa['name']}");
                continue;
            }
            if (!($pa['required'] ?? false) && ($pb['required'] ?? false)) {
                $this->anotar(
                    false,
                    "$nome: parâmetro passou a ser obrigatório: {$pa['name']}",
                );
            }
            $rotulo = "$nome parâmetro {$pa['name']}";
            $this->esquemas($pa['schema'], $pb['schema'], 'pedido', $rotulo, '');
        }
        $antigos = array_map($chave, $a);
        foreach ($b as $pb) {
            if (in_array($chave($pb), $antigos, true)) {
                continue;
            }
            if ($pb['required'] ?? false) {
                $this->anotar(
                    false,
                    "$nome: parâmetro obrigatório novo: {$pb['name']}",
                );
            } else {
                $this->anotar(true, "$nome: parâmetro opcional novo: {$pb['name']}");
            }
        }
    }

    public function operacao(array $a, array $b, string $nome): void
    {
        $this->parametros($a['parameters'] ?? [], $b['parameters'] ?? [], $nome);
        $pedidoA = $a['requestBody']['content']['application/json']['schema'] ?? null;
        $pedidoB = $b['requestBody']['content']['application/json']['schema'] ?? null;
        if ($pedidoA && $pedidoB) {
            $this->esquemas($pedidoA, $pedidoB, 'pedido', "$nome pedido", '');
        }
        foreach ($a['responses'] as $status => $respostaA) {
            if (!isset($b['responses'][$status])) {
                continue;
            }
            $conteudoA = resolver($this->antigo, $respostaA)['content'] ?? [];
            $conteudoB =
                resolver($this->novo, $b['responses'][$status])['content'] ?? [];
            foreach ($conteudoA as $tipo => $meio) {
                if (!isset($conteudoB[$tipo])) {
                    continue;
                }
                $esquemaB = $conteudoB[$tipo]['schema'];
                $this->esquemas(
                    $meio['schema'],
                    $esquemaB,
                    'resposta',
                    "$nome $status",
                    '',
                );
            }
        }
    }
}

/** @return Mudanca[] */
function compararContratos(array $antigo, array $novo): array
{
    $c = new Comparacao($antigo, $novo);
    foreach ($antigo['paths'] as $caminho => $operacoes) {
        foreach ($operacoes as $metodo => $op) {
            $nome = strtoupper($metodo) . " $caminho";
            $opNova = $novo['paths'][$caminho][$metodo] ?? null;
            if ($opNova) {
                $c->operacao($op, $opNova, $nome);
            } else {
                $c->anotar(false, "$nome: operação removida");
            }
        }
    }
    foreach ($novo['paths'] as $caminho => $operacoes) {
        foreach (array_keys($operacoes) as $metodo) {
            if (!isset($antigo['paths'][$caminho][$metodo])) {
                $c->anotar(true, strtoupper($metodo) . " $caminho: operação nova");
            }
        }
    }
    return $c->mudancas;
}
