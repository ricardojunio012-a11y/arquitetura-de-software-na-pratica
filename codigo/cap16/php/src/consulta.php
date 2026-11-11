<?php
// A versão "consulta": a consulta de inadimplência sobre 1 milhão de cobranças, sem
// índice, com um índice na coluna errada e com o índice certo, criado pela
// migração 003. Os planos vão para saida/consulta; os tempos, que variam, só para o
// terminal.
require_once __DIR__ . '/banco.php';
require_once __DIR__ . '/migracoes.php';

use function Morada\{aplicarMigracoes, conectar, recriarEsquema};

$dados = $argv[1];
$pastaMigracoes = "$dados/migracoes";
$banco = conectar(getenv('BANCO_URL'));
recriarEsquema($banco);
$aplicadas = aplicarMigracoes($banco, $pastaMigracoes, 2);
$banco->exec(file_get_contents("$dados/entrada/cobrancas.sql"));
$banco->exec('ANALYZE cobrancas');
// Sem paralelismo, o plano fica igual em qualquer máquina e mais fácil de ler
$banco->exec('SET max_parallel_workers_per_gather = 0');
$consulta = file_get_contents("$dados/entrada/inadimplencia.sql");

// Os nós que leem dados (varreduras de tabela e de índice), do plano em JSON
function varreduras(array $no): array
{
    $filhos = [];
    foreach ($no['Plans'] ?? [] as $filho) {
        $filhos = [...$filhos, ...varreduras($filho)];
    }
    if (!isset($no['Relation Name']) && !isset($no['Index Name'])) {
        return $filhos;
    }
    $tabela = isset($no['Relation Name']) ? " em {$no['Relation Name']}" : '';
    $indice = isset($no['Index Name']) ? " pelo índice {$no['Index Name']}" : '';
    $descartadas = $no['Rows Removed by Filter'] ?? 0;
    $linhas = "{$no['Actual Rows']} linhas aproveitadas, $descartadas descartadas";
    return ["{$no['Node Type']}$tabela$indice: $linhas", ...$filhos];
}

$planos = [];
$planejar = function (string $titulo) use ($banco, $consulta, &$planos): void {
    $texto = $banco->query("EXPLAIN (ANALYZE, FORMAT JSON) $consulta")->fetchColumn();
    $plano = json_decode($texto, true)[0];
    $planos[] = intdiv(count($planos), 3) + 1 . ". $titulo";
    foreach (varreduras($plano['Plan']) as $linha) {
        $planos[] = "   $linha";
    }
    $planos[] = '';
    printf("%s: %.1f ms\n", $titulo, $plano['Execution Time']);
};

$planejar('sem índice');
$banco->exec('CREATE INDEX cobrancas_vencimento ON cobrancas (vencimento)');
$banco->exec('ANALYZE cobrancas');
$planejar('índice só no vencimento');
$banco->exec('DROP INDEX cobrancas_vencimento');
$aplicadas = [...$aplicadas, ...aplicarMigracoes($banco, $pastaMigracoes)];
$banco->exec('ANALYZE cobrancas');
$planejar('índice da migração 003');

$resultado = [];
foreach ($banco->query($consulta) as $r) {
    $resultado[] =
        "unidade {$r['unidade']}: cobranças em aberto {$r['cobrancas']}, " .
        "total {$r['total_centavos']} centavos";
}

$saida = "$dados/saida/consulta";
@mkdir($saida, 0777, true);
file_put_contents("$saida/planos.txt", implode("\n", $planos));
file_put_contents("$saida/resultado.txt", implode("\n", $resultado) . "\n");
file_put_contents("$saida/migracoes.txt", implode("\n", $aplicadas) . "\n");
