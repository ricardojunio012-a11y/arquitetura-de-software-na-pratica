<?php
// Módulo de reservas. Etapa 5: fases separadas (Split Phase) e nenhum estado global.
// decidir() calcula; relatorio() e avisos() formatam; quem lê e grava é o main.
namespace Morada\Etapa5;

const ANTECEDENCIA_MINIMA_DIAS = 2;
const ACRESCIMO_SABADO_PORCENTO = 20;
const LIMITE_DE_CONVIDADOS = 50;
const TAXA_DE_LIMPEZA_EXTRA = 5000; // centavos

final readonly class Decisao
{
    public function __construct(
        public array $pedido,
        public string $email,
        public ?string $motivo,
        public int $valor,
    ) {}
}

function diasAte(string $dataIso, \DateTimeImmutable $hoje): int
{
    $data = new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC'));
    return intdiv($data->getTimestamp() - $hoje->getTimestamp(), 86400);
}

// O comentário original dizia "fim de semana", mas o código só olha o sábado
function ehSabado(string $dataIso): bool
{
    return (new \DateTimeImmutable($dataIso, new \DateTimeZone('UTC')))->format('w') ===
        '6';
}

function valorDaReserva(array $espaco, array $pedido): int
{
    $valor = $espaco['taxa'];
    if (ehSabado($pedido['data'])) {
        $valor += intdiv($valor * ACRESCIMO_SABADO_PORCENTO, 100);
    }
    if ($pedido['convidados'] > LIMITE_DE_CONVIDADOS) {
        $valor += TAXA_DE_LIMPEZA_EXTRA;
    }
    return $valor;
}

function motivoDaRecusa(
    array $pedido,
    array $unidade,
    \DateTimeImmutable $hoje,
    array $aprovadas,
): ?string {
    if ($unidade['emDebito']) {
        return 'débito';
    }
    if (diasAte($pedido['data'], $hoje) < ANTECEDENCIA_MINIMA_DIAS) {
        return 'antecedência';
    }
    foreach ($aprovadas as $r) {
        if ($r['espaco'] === $pedido['espaco'] && $r['data'] === $pedido['data']) {
            return 'conflito';
        }
    }
    return null;
}

// Fase 1: decidir cada pedido, em ordem. As aprovadas agora são locais.
function decidir(array $dados, \DateTimeImmutable $hoje): array
{
    $unidades = array_column($dados['unidades'], null, 'id');
    $espacos = array_column($dados['espacos'], null, 'id');
    $aprovadas = [];
    $decisoes = [];
    foreach ($dados['pedidos'] as $pedido) {
        $unidade = $unidades[$pedido['unidade']];
        $motivo = motivoDaRecusa($pedido, $unidade, $hoje, $aprovadas);
        $valor = 0;
        if ($motivo === null) {
            $aprovadas[] = $pedido;
            $valor = valorDaReserva($espacos[$pedido['espaco']], $pedido);
        }
        $decisoes[] = new Decisao($pedido, $unidade['email'], $motivo, $valor);
    }
    return $decisoes;
}

function reais(int $centavos): string
{
    return intdiv($centavos, 100) . ',' . sprintf('%02d', $centavos % 100);
}

// Fase 2: formatar o relatório e os avisos a partir das decisões
function relatorio(array $decisoes): array
{
    return array_map(function (Decisao $d) {
        $p = $d->pedido;
        $inicio = "{$p['id']};{$p['unidade']};{$p['espaco']};{$p['data']}";
        return $d->motivo !== null
            ? "$inicio;recusada;{$d->motivo}"
            : "$inicio;aprovada;" . reais($d->valor);
    }, $decisoes);
}

function avisos(array $decisoes): array
{
    return array_map(
        fn(Decisao $d) => [
            $d->email,
            $d->motivo !== null
                ? "Reserva {$d->pedido['id']} recusada ({$d->motivo})"
                : "Reserva {$d->pedido['id']} confirmada. Valor: R$ " .
                    reais($d->valor),
        ],
        $decisoes,
    );
}
