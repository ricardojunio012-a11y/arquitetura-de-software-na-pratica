<?php
// A versão "vazamento": o síndico do condomínio 12 abre o relatório de inadimplentes,
// primeiro sem RLS e depois com RLS. Depois, a administradora 3, que administra os
// condomínios 12 e 15, abre o mesmo relatório. A consulta com defeito é a mesma em
// todos os casos.
require_once __DIR__ . '/banco.php';
require_once __DIR__ . '/relatorio.php';

use function Morada\{comoAdministradora, comoCondominio, conectar, inadimplentes};

const SINDICO = 12;
const ADMINISTRADORA = 3; // administra os condomínios 12 e 15
const RECUSADO_PELA_POLITICA = '42501';

$dados = $argv[1];
$sql = fn(string $arquivo) => file_get_contents("$dados/sql/$arquivo");
$admin = conectar(getenv('BANCO_URL'));
$admin->exec($sql('esquema.sql'));
$app = conectar(getenv('APP_BANCO_URL'));

$registro = [];

function mostrar(
    int $passo,
    string $titulo,
    array $linhas,
    array &$registro,
    array $permitidos = [SINDICO],
): void {
    $registro[] = "$passo. $titulo";
    $vazadas = 0;
    foreach ($linhas as $l) {
        $permitido = in_array($l['condominio_id'], $permitidos, true);
        $alerta = $permitido ? '' : '  <- outro condomínio';
        $vazadas += $permitido ? 0 : 1;
        $registro[] =
            "   condomínio {$l['condominio_id']} | unidade {$l['unidade']} | " .
            "{$l['morador']} | {$l['valor_centavos']} centavos$alerta";
    }
    if (!$linhas) {
        $registro[] = '   nenhuma linha';
    }
    $registro[] = "   linhas de outros condomínios: $vazadas";
    $registro[] = '';
}

$relatorio = fn() => inadimplentes($app);
mostrar(
    1,
    'relatório do síndico do condomínio 12, sem RLS',
    comoCondominio($app, SINDICO, $relatorio),
    $registro,
);
$admin->exec($sql('rls.sql'));
mostrar(
    2,
    'o mesmo relatório, com RLS',
    comoCondominio($app, SINDICO, $relatorio),
    $registro,
);
mostrar(
    3,
    'com RLS, numa transação sem condomínio definido',
    comoCondominio($app, null, $relatorio),
    $registro,
);

$registro[] = '4. com RLS, o condomínio 12 tenta gravar uma cobrança do 15';
try {
    comoCondominio(
        $app,
        SINDICO,
        fn() => $app->exec(
            'INSERT INTO cobrancas (condominio_id, unidade, morador, valor_centavos, situacao) ' .
                "VALUES (15, '13', 'Hugo Dias', 38000, 'aberta')",
        ),
    );
    $registro[] = '   gravada';
} catch (PDOException $erro) {
    if ($erro->getCode() !== RECUSADO_PELA_POLITICA) {
        throw $erro;
    }
    $registro[] = '   recusada pelo banco: a linha não passa na política de RLS';
}

mostrar(
    5,
    'com RLS, a administradora 3, que administra os condomínios 12 e 15',
    comoAdministradora($app, ADMINISTRADORA, $relatorio),
    $registro,
    [12, 15],
);
$registro[] = '6. com RLS, a administradora 3 tenta gravar uma cobrança do 20';
try {
    comoAdministradora(
        $app,
        ADMINISTRADORA,
        fn() => $app->exec(
            'INSERT INTO cobrancas (condominio_id, unidade, morador, valor_centavos, situacao) ' .
                "VALUES (20, 'A-5', 'Hugo Dias', 61000, 'aberta')",
        ),
    );
    $registro[] = '   gravada';
} catch (PDOException $erro) {
    if ($erro->getCode() !== RECUSADO_PELA_POLITICA) {
        throw $erro;
    }
    $registro[] = '   recusada pelo banco: a linha não passa em nenhuma política';
}

$saida = "$dados/saida/vazamento";
@mkdir($saida, 0777, true);
file_put_contents("$saida/relatorio.txt", implode("\n", $registro) . "\n");
echo "vazamento: seis passos executados\n";
