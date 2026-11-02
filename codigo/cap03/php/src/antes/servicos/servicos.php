<?php
// Serviços do financeiro: calcula as cobranças e monta as saídas.
namespace Morada\Antes\Servicos;

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../util/util.php';
require_once __DIR__ . '/../relatorios/relatorios.php';

use Morada\Antes\Config\Config;
use function Morada\Antes\Relatorios\gerarRelatorio;
use function Morada\Antes\Util\competencia;
use function Morada\Antes\Util\diasDeAtraso;
use function Morada\Antes\Util\reais;

final class Servicos
{
    // Lista interna, mas pública: qualquer um pode ler e alterar
    public static array $cobrancas = [];

    public static function jurosDeMora(int $valor, string $vencimento): int
    {
        return intdiv($valor * diasDeAtraso($vencimento) + 1500, 3000);
    }

    public static function calcularTodas(): void
    {
        $despesas = Config::$dados['condominio']['despesasDoMesCentavos'];
        foreach (Config::$dados['unidades'] as $u) {
            $taxa = intdiv($despesas * $u['fracaoMilionesimos'] + 500000, 1000000);
            $fundo = intdiv($taxa * Config::$fundoPorcento + 50, 100);
            $d = $u['debitoAnterior'];
            $debito = $d ? $d['valorCentavos'] : 0;
            $multa = $d ? intdiv($debito * Config::$multaPorcento + 50, 100) : 0;
            $juros = $d ? self::jurosDeMora($debito, $d['vencimento']) : 0;
            $total = $taxa + $fundo + $debito + $multa + $juros;
            self::$cobrancas[] = compact(
                'taxa',
                'fundo',
                'debito',
                'multa',
                'juros',
                'total',
            ) + ['unidade' => $u];
        }
    }

    // Um parâmetro decide o que a função faz (acoplamento de controle)
    public static function gerarSaida(string $tipo): string
    {
        if ($tipo !== 'cobrancas') {
            return gerarRelatorio($tipo);
        }
        $linhas = [
            '# Cobranças ' .
            competencia() .
            ' - ' .
            Config::$dados['condominio']['nome'],
        ];
        $linhas[] = 'unidade;morador;taxa;fundo;debito;multa;juros;total';
        foreach (self::$cobrancas as $c) {
            $valores = array_map('Morada\Antes\Util\reais', [
                $c['taxa'],
                $c['fundo'],
                $c['debito'],
                $c['multa'],
                $c['juros'],
                $c['total'],
            ]);
            $linhas[] = implode(';', [
                $c['unidade']['id'],
                $c['unidade']['morador']['nome'],
                ...$valores,
            ]);
        }
        return implode("\n", $linhas) . "\n";
    }
}
