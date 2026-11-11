<?php
// A API pública do Morada para administradoras. Os erros seguem a RFC 9457 (problem
// details), a listagem é paginada por cursor e o pagamento exige uma chave de
// idempotência no cabeçalho Idempotency-Key. Cada administradora só enxerga os
// condomínios que administra.
namespace Morada\Api;

use PDO;

require_once __DIR__ . '/banco.php';

const PROBLEMAS = 'https://api.morada.example/problemas/';

class Problema extends \Exception
{
    public function __construct(
        public readonly int $status,
        public readonly string $tipo,
        public readonly string $titulo,
        string $detalhe,
    ) {
        parent::__construct($detalhe);
    }

    public function corpo(): array
    {
        return [
            'type' => PROBLEMAS . $this->tipo,
            'title' => $this->titulo,
            'status' => $this->status,
            'detail' => $this->getMessage(),
        ];
    }
}

function paraJson($dados): string
{
    return json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// O cursor é opaco para o cliente: o último identificador da página, em base64url
function cursorDe(string $id): string
{
    return rtrim(strtr(base64_encode($id), '+/', '-_'), '=');
}

function idDoCursor(string $cursor): string
{
    return base64_decode(strtr($cursor, '-_', '+/'));
}

function listarCobrancas(
    PDO $banco,
    string $administradora,
    string $condominio,
    array $consulta,
): array {
    $recebido = $consulta['limite'] ?? '20';
    $limite = ctype_digit($recebido) ? (int) $recebido : 0;
    if ($limite < 1 || $limite > 100) {
        throw new Problema(
            400,
            'limite-invalido',
            'Limite inválido',
            "limite deve estar entre 1 e 100, recebido $recebido",
        );
    }
    $situacao = $consulta['situacao'] ?? null;
    if ($situacao !== null && !in_array($situacao, ['aberta', 'paga'], true)) {
        throw new Problema(
            400,
            'situacao-invalida',
            'Situação inválida',
            "situação deve ser aberta ou paga, recebido $situacao",
        );
    }
    // Autorização por objeto: o condomínio de outra administradora responde como se
    // não existisse, para não revelar nem que ele existe
    $existe = $banco->prepare(
        'SELECT 1 FROM condominios WHERE id = ? AND administradora = ?',
    );
    $existe->execute([$condominio, $administradora]);
    if ($existe->fetch() === false) {
        throw new Problema(
            404,
            'condominio-inexistente',
            'Condomínio não encontrado',
            "não existe o condomínio $condominio",
        );
    }
    $depoisDe = isset($consulta['cursor']) ? idDoCursor($consulta['cursor']) : '';
    // Uma linha a mais que o limite diz se existe a próxima página
    $consultaSql = $banco->prepare(
        <<<SQL
        SELECT id, unidade, vencimento::text AS vencimento, valor_centavos, situacao
        FROM cobrancas
        WHERE condominio = ? AND (?::text IS NULL OR situacao = ?) AND id > ?
        ORDER BY id LIMIT ?
        SQL
        ,
    );
    $consultaSql->execute([$condominio, $situacao, $situacao, $depoisDe, $limite + 1]);
    $linhas = $consultaSql->fetchAll(PDO::FETCH_ASSOC);
    $dados = array_map(
        fn($c) => [
            'id' => $c['id'],
            'unidade' => $c['unidade'],
            'vencimento' => $c['vencimento'],
            'valorCentavos' => $c['valor_centavos'],
            'situacao' => $c['situacao'],
        ],
        array_slice($linhas, 0, $limite),
    );
    $proximo = count($linhas) > $limite ? cursorDe(end($dados)['id']) : null;
    return [200, ['dados' => $dados, 'proximo' => $proximo]];
}

// As regras do pagamento, dentro da transação aberta por registrarPagamento
function pagar(PDO $banco, string $administradora, array $pedido): array
{
    // A cobrança precisa ser de um condomínio da própria administradora
    $consulta = $banco->prepare(
        <<<SQL
        SELECT valor_centavos, situacao FROM cobrancas
        WHERE id = ? AND condominio IN
          (SELECT id FROM condominios WHERE administradora = ?)
        FOR UPDATE
        SQL
        ,
    );
    $consulta->execute([$pedido['cobranca'], $administradora]);
    $cobranca = $consulta->fetch(PDO::FETCH_ASSOC);
    if ($cobranca === false) {
        throw new Problema(
            422,
            'cobranca-inexistente',
            'Cobrança não encontrada',
            "não existe a cobrança {$pedido['cobranca']}",
        );
    }
    if ($cobranca['situacao'] === 'paga') {
        throw new Problema(
            409,
            'cobranca-paga',
            'Cobrança já paga',
            "a cobrança {$pedido['cobranca']} já foi paga",
        );
    }
    if ($cobranca['valor_centavos'] !== $pedido['valorCentavos']) {
        throw new Problema(
            422,
            'valor-divergente',
            'Valor divergente',
            "a cobrança {$pedido['cobranca']} vale {$cobranca['valor_centavos']} " .
                "centavos, e o pagamento informou {$pedido['valorCentavos']}",
        );
    }
    $id = $banco
        ->query("SELECT 'PG-' || lpad(nextval('pagamentos_seq')::text, 4, '0')")
        ->fetchColumn();
    $banco
        ->prepare('INSERT INTO pagamentos VALUES (?, ?, ?)')
        ->execute([$id, $pedido['cobranca'], $pedido['valorCentavos']]);
    $banco
        ->prepare("UPDATE cobrancas SET situacao = 'paga' WHERE id = ?")
        ->execute([$pedido['cobranca']]);
    return [201, ['id' => $id, ...$pedido, 'situacao' => 'confirmado']];
}

// Chave de idempotência: a chave e a resposta são gravadas na mesma transação do
// pagamento. Repetir o pedido devolve a resposta guardada, sem pagar de novo. A chave
// vale dentro de uma administradora: duas administradoras podem gerar a mesma.
function registrarPagamento(
    PDO $banco,
    string $administradora,
    ?string $chave,
    array $corpo,
): array {
    if ($chave === null || $chave === '') {
        throw new Problema(
            400,
            'chave-ausente',
            'Chave de idempotência ausente',
            'envie o cabeçalho Idempotency-Key com um identificador único do pedido',
        );
    }
    if (
        !is_string($corpo['cobranca'] ?? null) ||
        !is_int($corpo['valorCentavos'] ?? null)
    ) {
        throw new Problema(
            400,
            'pedido-invalido',
            'Pedido inválido',
            'informe cobranca (texto) e valorCentavos (inteiro)',
        );
    }
    // A forma canônica do pedido: só os campos que a operação usa, sempre na mesma
    // ordem. A ordem dos campos no JSON do cliente não muda a comparação.
    $pedido = [
        'cobranca' => $corpo['cobranca'],
        'valorCentavos' => $corpo['valorCentavos'],
    ];
    $banco->beginTransaction();
    try {
        // Quem grava a chave primeiro processa o pedido. Um pedido simultâneo com a
        // mesma chave espera aqui o primeiro terminar e encontra a resposta pronta.
        $nova = $banco->prepare(
            'INSERT INTO chaves_idempotencia (administradora, chave, pedido) ' .
                'VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
        );
        $nova->execute([$administradora, $chave, paraJson($pedido)]);
        if ($nova->rowCount() === 0) {
            $consulta = $banco->prepare(
                'SELECT pedido, status, resposta FROM chaves_idempotencia ' .
                    'WHERE administradora = ? AND chave = ?',
            );
            $consulta->execute([$administradora, $chave]);
            $anterior = $consulta->fetch(PDO::FETCH_ASSOC);
            $banco->commit();
            if ($anterior['pedido'] !== paraJson($pedido)) {
                throw new Problema(
                    422,
                    'chave-reutilizada',
                    'Chave de idempotência reutilizada',
                    "a chave $chave já foi usada com outro pedido",
                );
            }
            return [$anterior['status'], json_decode($anterior['resposta'], true)];
        }
        try {
            [$status, $resposta] = pagar($banco, $administradora, $pedido);
        } catch (Problema $problema) {
            [$status, $resposta] = [$problema->status, $problema->corpo()];
        }
        $banco
            ->prepare(
                'UPDATE chaves_idempotencia SET status = ?, resposta = ? ' .
                    'WHERE administradora = ? AND chave = ?',
            )
            ->execute([$status, paraJson($resposta), $administradora, $chave]);
        $banco->commit();
        return [$status, $resposta];
    } catch (\Throwable $erro) {
        if ($banco->inTransaction()) {
            $banco->rollBack();
        }
        throw $erro;
    }
}

// Atende um pedido HTTP e devolve [status, corpo]
function atender(
    PDO $banco,
    string $metodo,
    string $caminho,
    array $consulta,
    ?string $administradora,
    ?string $chave,
    string $corpo,
): array {
    try {
        // Em produção, o gateway valida o token OAuth 2.0 e repassa a administradora
        // dona do token. No laboratório, o cabeçalho Morada-Administradora faz esse
        // papel, e quem o envia é tratado como autenticado.
        if ($administradora === null || $administradora === '') {
            throw new Problema(
                401,
                'nao-autenticado',
                'Cliente não identificado',
                'envie o token de acesso (aqui, o cabeçalho Morada-Administradora)',
            );
        }
        if (
            $metodo === 'GET' &&
            preg_match('#^/v1/condominios/([^/]+)/cobrancas$#', $caminho, $m)
        ) {
            return listarCobrancas($banco, $administradora, $m[1], $consulta);
        }
        if ($metodo === 'POST' && $caminho === '/v1/pagamentos') {
            $pedido = json_decode($corpo, true);
            return registrarPagamento($banco, $administradora, $chave, $pedido);
        }
        throw new Problema(
            404,
            'rota-inexistente',
            'Rota não encontrada',
            "não existe $metodo $caminho",
        );
    } catch (Problema $problema) {
        return [$problema->status, $problema->corpo()];
    }
}
