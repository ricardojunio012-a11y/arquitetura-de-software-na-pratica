<?php
// O app do porteiro, no tablet. Sem internet, guarda as operações numa fila local e
// segue trabalhando; ao reconectar, envia a fila ao BFF e mostra os conflitos.
namespace Morada;

require_once __DIR__ . '/bff.php';

final class Tablet
{
    private array $versoes = [];
    private array $fila = [];
    private bool $online = true;
    private int $contador = 0;

    public function __construct(
        private readonly string $nome,
        private readonly \Closure $conectar,
        private array &$registro,
    ) {}

    // O tablet fala com o endereço do BFF, seja qual for o processo que o atende
    private function bff(): BffPorteiro
    {
        return ($this->conectar)();
    }

    private function log(string $texto): void
    {
        $this->registro[] = "tablet {$this->nome} $texto";
    }

    public function abrir(): void
    {
        $tela = $this->bff()->inicio();
        foreach ($tela['encomendasPendentes'] as $e) {
            $this->versoes[$e['encomenda']] = $e['versao'];
        }
        $pendentes = implode(
            ', ',
            array_column($tela['encomendasPendentes'], 'encomenda'),
        );
        $esperados = implode(', ', array_column($tela['visitantesEsperados'], 'nome'));
        $this->log("abriu: encomendas [$pendentes], visitantes esperados [$esperados]");
    }

    public function desconectar(): void
    {
        $this->online = false;
        $this->log('perdeu a internet');
    }

    public function operar(array $op): void
    {
        $this->contador++;
        $op = ['id' => "op-{$this->nome}{$this->contador}"] + $op;
        if (isset($op['encomenda'])) {
            $op['versaoVista'] = $this->versoes[$op['encomenda']];
        }
        if (!$this->online) {
            $this->fila[] = $op;
            $this->log("guardou {$this->descrever($op)} na fila local");
            return;
        }
        [[, $resultado]] = $this->bff()->sincronizar($this->nome, [$op]);
        $this->log("enviou {$this->descrever($op)}: $resultado");
    }

    // Ao reconectar, a fila vai em lote, e a resposta pode se perder no caminho
    public function reconectar(bool $perderResposta): void
    {
        $this->online = true;
        $resultados = $this->bff()->sincronizar($this->nome, $this->fila);
        if ($perderResposta) {
            $n = count($this->fila);
            $this->log("voltou e enviou $n operações; a resposta se perdeu");
            return;
        }
        $this->mostrar('enviou', $resultados);
    }

    // Sem resposta, o tablet não sabe o que foi aplicado: reenvia o mesmo lote
    public function reenviar(): void
    {
        $this->mostrar('reenviou', $this->bff()->sincronizar($this->nome, $this->fila));
    }

    private function mostrar(string $verbo, array $resultados): void
    {
        $n = count($this->fila);
        $this->log("$verbo $n operações:");
        foreach ($resultados as [$op, $resultado]) {
            $this->registro[] = "  {$this->descrever($op)}: $resultado";
        }
        $this->fila = [];
    }

    private function descrever(array $op): string
    {
        $alvo = $op['encomenda'] ?? $op['nome'];
        return "{$op['id']} ({$op['tipo']} $alvo)";
    }
}
