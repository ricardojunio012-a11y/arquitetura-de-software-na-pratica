<?php
// Etapa 2: o código original depois dos três pedidos de mudança
// (desconto por pontualidade, Pix e aviso por WhatsApp), feitos do jeito mais direto.
namespace Morada\Etapa2;

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
    $limiteDesconto = "05/$mes/$ano";
    $nome = $dados['condominio']['nome'];
    $reais = fn(int $c) => number_format(intdiv($c, 100), 0, ',', '.') .
        ',' .
        str_pad((string) ($c % 100), 2, '0', STR_PAD_LEFT);

    $linhas = ["# Cobranças $competencia - $nome - vencimento $vencimento"];
    $linhas[] =
        'unidade;morador;taxa;fundo;debito;multa;juros;total;total_ate_05;pagamento';
    $emails = '';
    $whatsapp = '';

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
        // desconto de 5% sobre a taxa para quem paga até o dia 5 sem débito
        $totalAte05 = 0;
        if ($debito === 0) {
            $totalAte05 = $total - intdiv($taxa * 5 + 50, 100);
        }
        if ($u['meioPagamento'] === 'pix') {
            $codigo = "PIX-{$dados['condominio']['id']}-$ano$mes-{$u['id']}-$total";
        } else {
            $codigo = "BOL-{$dados['condominio']['id']}-$ano$mes-{$u['id']}-$total";
        }

        $valores = array_map($reais, [$taxa, $fundo, $debito, $multa, $juros, $total]);
        $valores[] = $totalAte05 > 0 ? $reais($totalAte05) : '-';
        $linhas[] = implode(';', [
            $u['id'],
            $u['morador']['nome'],
            ...$valores,
            $codigo,
        ]);

        if ($u['morador']['canal'] === 'whatsapp') {
            $whatsapp .= "Para: {$u['morador']['telefone']}\n";
            $whatsapp .= "$nome: taxa $competencia da unidade {$u['id']}: ";
            $whatsapp .= 'R$ ' . $reais($total) . ", vence $vencimento.";
            if ($totalAte05 > 0) {
                $whatsapp .= " Até $limiteDesconto: R$ " . $reais($totalAte05) . '.';
            }
            $meio = $u['meioPagamento'] === 'pix' ? 'Pix copia e cola' : 'Boleto';
            $whatsapp .= " $meio: $codigo\n----\n";
        } else {
            $emails .= "Para: {$u['morador']['email']}\n";
            $emails .= "Assunto: Taxa condominial $competencia - $nome";
            $emails .= " - Unidade {$u['id']}\n\n";
            $emails .= "Olá, {$u['morador']['nome']}.\n\n";
            $emails .= "A taxa condominial de $competencia da unidade {$u['id']} ";
            $emails .= "está disponível.\n";
            $emails .= 'Valor: R$ ' . $reais($total) . "\n";
            $emails .= "Vencimento: $vencimento\n";
            if ($totalAte05 > 0) {
                $emails .= "Pagando até $limiteDesconto, o valor cai para ";
                $emails .= 'R$ ' . $reais($totalAte05) . ".\n";
            }
            if ($debito > 0) {
                $emails .=
                    'Inclui débito anterior de R$ ' .
                    $reais($debito) .
                    ', com multa de ';
                $emails .=
                    'R$ ' . $reais($multa) . ' e juros de R$ ' . $reais($juros) . ".\n";
            }
            if ($u['meioPagamento'] === 'pix') {
                $emails .= "Pix copia e cola: $codigo\n\n";
            } else {
                $emails .= "Boleto: $codigo\n\n";
            }
            $emails .= "Administração do $nome\n----\n";
        }
    }

    if (!is_dir($saida)) {
        mkdir($saida, 0777, true);
    }
    file_put_contents("$saida/cobrancas.txt", implode("\n", $linhas) . "\n");
    file_put_contents("$saida/emails.txt", $emails);
    file_put_contents("$saida/whatsapp.txt", $whatsapp);
}
