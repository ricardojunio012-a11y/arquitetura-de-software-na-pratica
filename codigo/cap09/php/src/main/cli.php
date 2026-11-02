<?php
// Uso: php cli.php <comando> [argumentos]   (repositório no PostgreSQL)
//      php cli.php preparar-banco            (apaga e recria a tabela)
// Cada execução é um processo novo: o estado fica no banco, entre uma e outra.
require_once __DIR__ . '/montar.php';
require_once __DIR__ . '/../adaptadores/entrada/cli.php';

use function Morada\Adaptadores\Entrada\executar;

$args = array_slice($argv, 1);
$preparar = ($args[0] ?? '') === 'preparar-banco';
[$servico] = montar('postgres', $preparar);
[$texto, $codigo] = $preparar ? ['banco preparado', 0] : executar($servico, $args);
echo $texto . "\n";
exit($codigo);
