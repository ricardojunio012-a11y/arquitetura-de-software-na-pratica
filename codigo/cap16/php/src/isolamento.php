<?php
// A versão "isolamento": duas saídas do fundo de reserva, intercaladas sempre na
// mesma ordem, em três níveis de isolamento. Cada transação confere o saldo antes
// de registrar a sua saída, e mesmo assim o saldo pode ficar negativo.
require_once __DIR__ . '/banco.php';
require_once __DIR__ . '/fundo.php';
require_once __DIR__ . '/migracoes.php';

use function Morada\{
    aplicarMigracoes,
    conectar,
    inserirSaida,
    prepararFundo,
    reais,
    recriarEsquema,
    saldo,
};

const FALHA_DE_SERIALIZACAO = '40001';

$dados = $argv[1];
$url = getenv('BANCO_URL');
$banco = conectar($url);
recriarEsquema($banco);
aplicarMigracoes($banco, "$dados/migracoes");

$registro = [];

// Uma saída inteira, sem intercalação: usada na nova tentativa
function tentarDeNovo(
    PDO $t,
    string $nivel,
    int $valor,
    string $motivo,
    array &$registro,
): void {
    $t->exec("BEGIN ISOLATION LEVEL $nivel");
    $lido = saldo($t, 1);
    $registro[] = 'T2 lê o saldo: ' . reais($lido);
    if ($lido < $valor) {
        $registro[] = 'T2 recusa a saída de ' . reais($valor) . ': saldo insuficiente';
        $t->exec('ROLLBACK');
        return;
    }
    inserirSaida($t, 1, $valor, $motivo);
    $t->exec('COMMIT');
    $registro[] = 'T2 registra a saída de ' . reais($valor) . ' e confirma';
}

foreach (['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'] as $nivel) {
    $registro[] = "== $nivel";
    prepararFundo($banco);
    $t1 = conectar($url);
    $t2 = conectar($url);
    $t1->exec("BEGIN ISOLATION LEVEL $nivel");
    $t2->exec("BEGIN ISOLATION LEVEL $nivel");
    $registro[] = 'T1 e T2 começam';
    $lido1 = saldo($t1, 1);
    $registro[] = 'T1 lê o saldo: ' . reais($lido1);
    $lido2 = saldo($t2, 1);
    $registro[] = 'T2 lê o saldo: ' . reais($lido2);
    if ($lido1 >= 70000) {
        inserirSaida($t1, 1, 70000, 'conserto do portão');
        $registro[] = 'T1 registra a saída de ' . reais(70000);
    }
    if ($lido2 >= 60000) {
        inserirSaida($t2, 1, 60000, 'pintura da fachada');
        $registro[] = 'T2 registra a saída de ' . reais(60000);
    }
    $t1->exec('COMMIT');
    $registro[] = 'T1 confirma';
    try {
        $t2->exec('COMMIT');
        $registro[] = 'T2 confirma';
    } catch (PDOException $erro) {
        if ($erro->getCode() !== FALHA_DE_SERIALIZACAO) {
            throw $erro;
        }
        $registro[] = 'T2 não confirma: falha de serialização; tenta de novo';
        $t2->exec('ROLLBACK');
        tentarDeNovo($t2, $nivel, 60000, 'pintura da fachada', $registro);
    }
    $t1 = $t2 = null;
    $final = saldo($banco, 1);
    $aviso = $final < 0 ? ' (negativo: a regra foi violada)' : '';
    $registro[] = 'saldo final: ' . reais($final) . $aviso;
    $registro[] = '';
}

$saida = "$dados/saida/isolamento";
@mkdir($saida, 0777, true);
file_put_contents("$saida/execucao.txt", implode("\n", $registro));
echo "isolamento: três níveis executados\n";
