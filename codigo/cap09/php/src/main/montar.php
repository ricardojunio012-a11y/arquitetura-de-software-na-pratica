<?php
// Raiz de composição: o único lugar que escolhe os adaptadores e os liga ao núcleo.
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../aplicacao/servico-de-reservas.php';
require_once __DIR__ . '/../adaptadores/saida/em-memoria.php';
require_once __DIR__ . '/../adaptadores/saida/postgres.php';

use Morada\Adaptadores\Saida\{AgendasEmMemoria, AgendasNoPostgres};
use Morada\Aplicacao\ServicoDeReservas;
use Morada\Dominio\Espaco;

function montar(string $repositorio, bool $preparar = false): array
{
    $dados = json_decode(file_get_contents('/dados/entrada/espacos.json'), true);
    $espacos = array_map(
        fn($e) => new Espaco(
            $e['id'],
            $e['taxaCentavos'],
            $e['antecedenciaMinimaDias'],
        ),
        $dados['espacos'],
    );
    if ($repositorio === 'memoria') {
        $agendas = new AgendasEmMemoria($espacos);
        return [new ServicoDeReservas($agendas), $agendas];
    }
    // BANCO_URL: postgresql://usuario:senha@servidor:porta/banco
    $u = parse_url(getenv('BANCO_URL'));
    $banco = new PDO(
        "pgsql:host={$u['host']};port={$u['port']};dbname=" . ltrim($u['path'], '/'),
        $u['user'],
        $u['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
    $agendas = new AgendasNoPostgres($banco, $espacos);
    if ($preparar) {
        $agendas->preparar();
    }
    return [new ServicoDeReservas($agendas), $agendas];
}
