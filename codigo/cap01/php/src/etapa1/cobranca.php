<?php
// Etapa 1: o primeiro código do Morada. Tudo numa função só, como costuma nascer.
namespace Morada\Etapa1;

function gerarCobrancaMensal(
    string $entrada,
    string $saida,
    ?\DateTimeImmutable $hoje = null,
) {
    $hoje ??= new \DateTimeImmutable('today', new \DateTimeZone('UTC'));
    $dados = json_decode(file_get_contents($entrada), true);
    $ano = $hoje->format('Y');
    $mes = $hoje->format('m');
    $competencia = "$mes/$ano";
    $vencimento = "10/$mes/$ano";
    $nome = $dados['condominio']['nome'];
    $reais = fn(int $c) => number_format(intdiv($c, 100), 0, ',', '.') .
        ',' .
        str_pad((string) ($c % 100), 2, '0', STR_PAD_LEFT);

    $linhas = ["# Cobranças $competencia - $nome - vencimento $vencimento"];
    $linhas[] = 'unidade;morador;taxa;fundo;debito;multa;juros;total;pagamento';
    $emails = '';

    foreach ($dados['unidades'] as $u) {
        // taxa pela fração ideal, arredondada para o centavo mais próximo
        $despesas = $dados['condominio']['despesasDoMesCentavos'];
        $taxa = intdiv($despesas * $u['fracaoMilionesimos'] + 500000, 1000000);
        $fundo = intdiv($taxa * 10 + 50, 100); // fundo de reserva: 10%
        $debito = 0;
        $multa = 0;
        $juros = 0;
        if ($u['debitoAnterior'] !== null) {
            $debito = $u['debitoAnterior']['valorCentavos'];
            $multa = intdiv($debito * 2 + 50, 100); // multa de 2%
            $venc = new \DateTimeImmutable($u['debitoAnterior']['vencimento']);
            $dias = $venc->diff($hoje)->days;
            $juros = intdiv($debito * $dias + 1500, 3000); // 1% ao mês, proporcional
        }
        $total = $taxa + $fundo + $debito + $multa + $juros;
        $codigo = "BOL-{$dados['condominio']['id']}-$ano$mes-{$u['id']}-$total";

        $valores = array_map($reais, [$taxa, $fundo, $debito, $multa, $juros, $total]);
        $linhas[] = implode(';', [
            $u['id'],
            $u['morador']['nome'],
            ...$valores,
            $codigo,
        ]);

        $emails .= "Para: {$u['morador']['email']}\n";
        $emails .= "Assunto: Taxa condominial $competencia - $nome";
        $emails .= " - Unidade {$u['id']}\n\n";
        $emails .= "Olá, {$u['morador']['nome']}.\n\n";
        $emails .= "A taxa condominial de $competencia da unidade {$u['id']} ";
        $emails .= "está disponível.\n";
        $emails .= 'Valor: R$ ' . $reais($total) . "\n";
        $emails .= "Vencimento: $vencimento\n";
        if ($debito > 0) {
            $emails .=
                'Inclui débito anterior de R$ ' . $reais($debito) . ', com multa de ';
            $emails .=
                'R$ ' . $reais($multa) . ' e juros de R$ ' . $reais($juros) . ".\n";
        }
        $emails .= "Boleto: $codigo\n\n";
        $emails .= "Administração do $nome\n----\n";
    }

    if (!is_dir($saida)) {
        mkdir($saida, 0777, true);
    }
    file_put_contents("$saida/cobrancas.txt", implode("\n", $linhas) . "\n");
    file_put_contents("$saida/emails.txt", $emails);
}
