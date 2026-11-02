<?php
// Tudo numa função: as regras em ifs encadeados e o Banco Alfa chamado no meio do
// cálculo. Uma regra nova ou outro banco exigem mudar esta função.
namespace Morada\Antes;

require_once __DIR__ . '/../compartilhado/datas.php';
require_once __DIR__ . '/../compartilhado/dinheiro.php';
require_once __DIR__ . '/../externos/banco-alfa.php';

use Morada\Externos\ClienteBancoAlfa;
use function Morada\Compartilhado\{dataBr, dataDoMes, diaMes, diasEntre, rotuloDoMes};
use function Morada\Compartilhado\{parteDe, percentual, reais, reaisComPonto};

function linha(string $texto, int $valor): string
{
    return '  ' .
        mb_str_pad($texto, 40) .
        str_pad(reais($valor), 10, ' ', STR_PAD_LEFT);
}

function emitirCobrancas(array $dados, \DateTimeImmutable $hoje): array
{
    $p = $dados['politica'];
    $vencimento = dataDoMes($hoje, $p['vencimentoDia']);
    $descontoAte = dataDoMes($hoje, $p['descontoAteDia']);
    $titulo = rotuloDoMes($hoje) . ' - ' . $dados['condominio']['nome'];
    $banco = new ClienteBancoAlfa();
    $cobrancas = ["# Cobranças $titulo"];
    $registros = ["# Registros $titulo - Banco Alfa"];
    $registros[] = 'unidade;identificador;valor;desconto';

    foreach ($dados['unidades'] as $u) {
        $itens = [];
        $despesas = $dados['condominio']['despesasDoMesCentavos'];
        $taxa = parteDe($despesas, $u['fracaoMilionesimos']);
        $itens[] = ['Taxa condominial', $taxa];
        $fundo = percentual($taxa, $p['fundoDeReservaPorcento']);
        $itens[] = ["Fundo de reserva ({$p['fundoDeReservaPorcento']}%)", $fundo];
        if (!empty($u['sindico'])) {
            $itens[] = ['Isenção do síndico', -$taxa];
        }
        $d = $u['debitoAnterior'];
        if ($d) {
            $v = $d['valorCentavos'];
            $dias = diasEntre($d['vencimento'], $hoje);
            $juros = intdiv($v * $p['jurosAoMesPorcento'] * $dias + 1500, 3000);
            $venc = diaMes($d['vencimento']);
            $itens[] = ["Débito anterior (venc. $venc)", $v];
            $itens[] = [
                "Multa ({$p['multaPorcento']}%)",
                percentual($v, $p['multaPorcento']),
            ];
            $itens[] = ["Juros ($dias dias)", $juros];
        }
        $total = array_sum(array_column($itens, 1));
        $pd = $p['descontoAntecipadoPorcento'];
        // Sem desconto para o síndico e para quem tem débito (regra do capítulo 1)
        $desconto = !empty($u['sindico']) || $d ? 0 : percentual($taxa, $pd);

        array_push($cobrancas, '', "{$u['id']} {$u['morador']['nome']}");
        foreach ($itens as [$texto, $valor]) {
            $cobrancas[] = linha($texto, $valor);
        }
        $ate = diaMes($descontoAte);
        if ($desconto > 0) {
            $cobrancas[] = linha("Desconto até $ate ($pd%)", -$desconto);
        }
        $cobrancas[] = linha('Total', $total);
        if ($desconto > 0) {
            $cobrancas[] = linha("Total com desconto até $ate", $total - $desconto);
        }

        // O cálculo conhece o banco: trocar de banco é mudar esta função
        $pedido = [
            'pagador' => $u['morador']['nome'],
            'valor' => reaisComPonto($total),
            'vencimento' => dataBr($vencimento),
        ];
        if ($desconto > 0) {
            $pedido['desconto'] = [
                'valor' => reaisComPonto($desconto),
                'ate' => dataBr($descontoAte),
            ];
        }
        $boleto = $banco->emitirBoleto($pedido);
        $registros[] =
            "{$u['id']};boleto {$boleto['nossoNumero']};" .
            reais($total) .
            ';' .
            reais($desconto);
    }
    return [implode("\n", $cobrancas) . "\n", implode("\n", $registros) . "\n"];
}
