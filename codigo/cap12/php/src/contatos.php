<?php
// Uso: php contatos.php <pasta-de-saída>
// A parte difícil da extração. Para avisar, a Comunicação precisa do e-mail do
// morador, que pertence ao Cadastro e, no monólito, vinha de uma junção com a
// tabela dele. Fora do monólito, sem tabela compartilhada, há dois caminhos:
// consultar o Cadastro por API a cada aviso ou manter uma réplica dos contatos,
// alimentada pelos eventos ContatoAlterado. Um relógio simulado, em minutos,
// deixa a saída igual em qualquer máquina.

$cenario = json_decode(file_get_contents('/dados/entrada/contatos.json'), true);
$mudancas = $cenario['mudancas'];
$de = $cenario['cadastroFora']['de'];
$ate = $cenario['cadastroFora']['ate'];
$atraso = $cenario['atrasoDaReplica'];
$saida = $argv[1];

$unidadeDo = fn(int $aviso) => sprintf(
    'U-%02d',
    (($aviso - 1) % $cenario['unidades']) + 1,
);
$cadastroNoAr = fn(int $minuto) => $minuto < $de || $minuto > $ate;

// O e-mail de uma unidade num minuto, contando as mudanças que já valiam
function emailEm(
    array $mudancas,
    string $unidade,
    int $minuto,
    int $atrasoDaCopia = 0,
): string {
    $email = 'morador.' . strtolower(str_replace('-', '', $unidade)) . '@exemplo.com';
    foreach ($mudancas as $m) {
        if ($m['unidade'] === $unidade && $m['minuto'] + $atrasoDaCopia <= $minuto) {
            $email = $m['email'];
        }
    }
    return $email;
}

// Caminho 1: a cada aviso, pergunta o e-mail ao Cadastro. Se ele não responde, o
// aviso espera numa fila local e sai quando o Cadastro voltar.
$chamadas = 0;
$erros = 0;
$naHora = 0;
$maiorAtraso = 0;
$adiados = [];
for ($aviso = 1; $aviso <= $cenario['avisos']; $aviso++) {
    $minuto = $aviso;
    if ($cadastroNoAr($minuto)) {
        foreach ($adiados as $antigo) {
            $chamadas++;
            $maiorAtraso = max($maiorAtraso, $minuto - $antigo);
        }
        $adiados = [];
    }
    $chamadas++;
    if (!$cadastroNoAr($minuto)) {
        $erros++;
        $adiados[] = $minuto;
        continue;
    }
    $naHora++;
}
$linhas = [
    'Consulta ao Cadastro por API, a cada aviso',
    "  chamadas ao Cadastro: $chamadas ($erros com erro)",
    "  avisos enviados na hora: $naHora",
    "  avisos adiados até o Cadastro voltar: $erros (o maior atraso: $maiorAtraso min)",
    // Cada consulta lê o e-mail atual: nenhum aviso sai para um endereço antigo
    '  avisos para e-mail desatualizado: 0',
    '',
];

// Caminho 2: a Comunicação guarda uma cópia dos contatos, carregada uma vez e
// atualizada pelos eventos, que chegam alguns minutos depois da mudança
$desatualizados = [];
for ($aviso = 1; $aviso <= $cenario['avisos']; $aviso++) {
    $unidade = $unidadeDo($aviso);
    if (
        emailEm($mudancas, $unidade, $aviso, $atraso) ===
        emailEm($mudancas, $unidade, $aviso)
    ) {
        continue;
    }
    $daUnidade = array_filter(
        $mudancas,
        fn($x) => $x['unidade'] === $unidade && $x['minuto'] <= $aviso,
    );
    $m = end($daUnidade);
    $desatualizados[] = sprintf(
        '    E-P-%03d para %s: e-mail antigo (mudou no minuto %d; a réplica, no %d)',
        $aviso,
        $unidade,
        $m['minuto'],
        $m['minuto'] + $atraso,
    );
}
$aplicados = count(
    array_filter($mudancas, fn($m) => $m['minuto'] + $atraso <= $cenario['avisos']),
);
array_push(
    $linhas,
    "Réplica dos contatos, alimentada por eventos (atraso de $atraso min)",
    "  carga inicial: {$cenario['unidades']} contatos",
    "  eventos ContatoAlterado aplicados: $aplicados",
    '  chamadas ao Cadastro: 0',
    "  avisos enviados na hora: {$cenario['avisos']}",
    '  avisos adiados até o Cadastro voltar: 0',
    '  avisos para e-mail desatualizado: ' . count($desatualizados),
    ...$desatualizados,
);

@mkdir("$saida/contatos", 0777, true);
file_put_contents("$saida/contatos/resultado.txt", implode("\n", $linhas) . "\n");
echo "contatos: saída em $saida/contatos\n";
